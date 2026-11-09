import {
  BrokerAccountSummary,
  BrokerClosedPosition,
  BrokerConfig,
  BrokerId,
  BrokerOrderResult,
  BrokerPosition,
  IBrokerAdapter,
  StandardizedOrderRequest,
} from '../types/broker';
import { brokerVault } from './brokerVault';
import { CapitalComAdapter } from './adapters/capitalComAdapter';
import { MetaTraderAdapter } from './adapters/metaTraderAdapter';
import { IgAdapter } from './adapters/igAdapter';
import {
  calculateRiskBasedOrderMetrics,
  getInstrumentDefinition,
  areInstrumentsCorrelated,
  getTerminalSymbolFromBroker,
} from './symbolMapper';
import { ArbiterOutput } from '../types/debate';
import { FeatureSnapshot } from '../types/market';
import { scorecardService } from '../backtest/scorecards';
import { AgentName } from '../types/agent';

export interface ExecutionAuditLog {
  id: string;
  timestamp: number;
  brokerId: BrokerId;
  symbol: string;
  direction: 'BUY' | 'SELL';
  units: number;
  riskPct?: number;
  riskCapitalUsd?: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
  status: 'FILLED' | 'REJECTED' | 'FAILED' | 'CLOSED';
  source: 'AUTO_ARBITER' | 'MANUAL_TICKET' | 'SCANNER' | 'CLEANUP_DUPLICATES';
  message: string;
}

const ALL_SPECIALIST_AGENTS: AgentName[] = [
  'TREND_MOMENTUM',
  'MEAN_REVERSION',
  'VOLATILITY_REGIME',
  'LIQUIDITY_ORDERFLOW',
  'PATTERN_STRUCTURE',
  'FUNDAMENTAL_MACRO',
  'SENTIMENT_NEWS',
  'CORRELATION_INTERMARKET',
  'SEASONALITY_ANALOG',
  'RISK_EXECUTION',
];

class BrokerManager {
  private adapters: Record<BrokerId, IBrokerAdapter>;
  private auditLogs: ExecutionAuditLog[] = [];
  private lastExecutedSymbolTimestamps: Map<string, number> = new Map();
  private syncedClosedTicketIds: Set<string> = new Set();
  private dailyStartingEquity: Map<BrokerId, { dateKey: string; equity: number }> = new Map();

  constructor() {
    this.adapters = {
      CAPITAL_COM: new CapitalComAdapter(),
      MT5: new MetaTraderAdapter(),
      IG: new IgAdapter(),
    };

    // Auto-connect default active broker on boot
    this.initActiveBroker();
  }

  private async initActiveBroker(): Promise<void> {
    const active = brokerVault.getActiveBroker();
    const adapter = this.adapters[active.id];
    if (adapter) {
      try {
        const res = await adapter.connect(active);
        brokerVault.updateConfig(active.id, {
          status: res.success ? 'CONNECTED' : 'ERROR',
          latencyMs: res.latencyMs,
          lastConnectedAt: Date.now(),
        });
      } catch (err: any) {
        brokerVault.updateConfig(active.id, {
          status: 'ERROR',
          errorMessage: err.message,
        });
      }
    }
  }

  public getAdapter(id: BrokerId): IBrokerAdapter {
    return this.adapters[id];
  }

  public getActiveAdapter(): IBrokerAdapter {
    const activeConf = brokerVault.getActiveBroker();
    return this.adapters[activeConf.id];
  }

  public async connectBroker(id: BrokerId): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const conf = brokerVault.getConfig(id);
    const adapter = this.adapters[id];
    try {
      brokerVault.updateConfig(id, { status: 'CONNECTING' });
      const res = await adapter.connect(conf);
      brokerVault.updateConfig(id, {
        status: res.success ? 'CONNECTED' : 'ERROR',
        latencyMs: res.latencyMs,
        lastConnectedAt: Date.now(),
        errorMessage: res.success ? undefined : res.message,
      });
      return res;
    } catch (err: any) {
      brokerVault.updateConfig(id, {
        status: 'ERROR',
        errorMessage: err.message,
      });
      return { success: false, latencyMs: 0, message: err.message };
    }
  }

  public async disconnectBroker(id: BrokerId): Promise<{ success: boolean; message: string }> {
    const adapter = this.adapters[id];
    try {
      if (adapter) {
        await adapter.disconnect();
      }
      brokerVault.updateConfig(id, {
        status: 'DISCONNECTED',
        latencyMs: undefined,
        errorMessage: undefined,
      });
      return { success: true, message: `Broker ${id} disconnected successfully.` };
    } catch (err: any) {
      return { success: false, message: `Failed to disconnect broker: ${err.message}` };
    }
  }

  /**
   * Feeds newly closed broker positions into the 10-agent Bayesian Scorecard engine
   * so agent weights continuously adapt to real broker trade outcomes.
   */
  private syncClosedTradesToBayesianScorecards(closedPositions: BrokerClosedPosition[]): void {
    for (const c of closedPositions) {
      if (this.syncedClosedTicketIds.has(c.brokerTicketId)) continue;
      this.syncedClosedTicketIds.add(c.brokerTicketId);

      try {
        scorecardService.recordTradeResolution(
          c.symbol,
          'H1',
          c.direction,
          c.realizedPnLR,
          ALL_SPECIALIST_AGENTS.map((agent) => ({
            agent,
            direction: c.direction,
          }))
        );
      } catch {
        // Non-blocking scorecard update
      }
    }
  }

  public async getActiveAccountSummary(): Promise<BrokerAccountSummary> {
    const activeConf = brokerVault.getActiveBroker();
    const adapter = this.getActiveAdapter();

    const [rawSummary, openPositions, closedPositions] = await Promise.all([
      adapter.getAccountSummary(),
      adapter.getOpenPositions(),
      adapter.getClosedPositions(),
    ]);

    this.syncClosedTradesToBayesianScorecards(closedPositions);

    // Compute Realized PnL, Win Rate, Profit Factor from synced closed trades
    let realizedPnL = 0;
    let realizedPnLR = 0;
    let wins = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    for (const c of closedPositions) {
      realizedPnL += c.realizedPnL;
      realizedPnLR += c.realizedPnLR;
      if (c.realizedPnL > 0) {
        wins++;
        grossProfit += c.realizedPnL;
      } else if (c.realizedPnL < 0) {
        grossLoss += Math.abs(c.realizedPnL);
      }
    }

    const closedTradesCount = closedPositions.length;
    const winRate = closedTradesCount > 0 ? Number(((wins / closedTradesCount) * 100).toFixed(1)) : 0;
    const profitFactor =
      grossLoss > 0
        ? Number((grossProfit / grossLoss).toFixed(2))
        : grossProfit > 0
        ? 9.99
        : 0;

    // Compute Portfolio Heat % across open positions (positions locked at Breakeven have 0% open risk)
    let portfolioHeatPct = 0;
    for (const p of openPositions) {
      const isBe =
        p.isBreakevenLocked ||
        (p.stopLoss > 0 &&
          ((p.direction === 'BUY' && p.stopLoss >= p.openPrice) ||
            (p.direction === 'SELL' && p.stopLoss <= p.openPrice)));
      if (!isBe) {
        portfolioHeatPct += p.riskPct ?? activeConf.defaultRiskPct ?? 1.0;
      }
    }
    portfolioHeatPct = Number(portfolioHeatPct.toFixed(2));

    // Track daily starting equity & Daily Drawdown %
    const todayKey = new Date().toISOString().slice(0, 10);
    const trackedDaily = this.dailyStartingEquity.get(activeConf.id);
    if (!trackedDaily || trackedDaily.dateKey !== todayKey) {
      this.dailyStartingEquity.set(activeConf.id, {
        dateKey: todayKey,
        equity: rawSummary.balance > 0 ? rawSummary.balance : 15000,
      });
    }
    const startEq = this.dailyStartingEquity.get(activeConf.id)?.equity || rawSummary.balance || 15000;
    const dailyDrawdownPct =
      startEq > 0 ? Number((((rawSummary.equity - startEq) / startEq) * 100).toFixed(2)) : 0;
    const maxDailyDd = activeConf.maxDailyDrawdownPct || 3.0;
    const isCircuitBreakerActive = dailyDrawdownPct <= -Math.abs(maxDailyDd);

    return {
      ...rawSummary,
      openPositionsCount: openPositions.length,
      realizedPnL: Number(realizedPnL.toFixed(2)),
      realizedPnLR: Number(realizedPnLR.toFixed(2)),
      winRate,
      profitFactor,
      closedTradesCount,
      portfolioHeatPct,
      dailyDrawdownPct,
      isCircuitBreakerActive,
      defaultRiskPct: activeConf.defaultRiskPct || 1.0,
    };
  }

  public async getActiveOpenPositions(): Promise<BrokerPosition[]> {
    const adapter = this.getActiveAdapter();
    return adapter.getOpenPositions();
  }

  public async getActiveClosedPositions(): Promise<BrokerClosedPosition[]> {
    const adapter = this.getActiveAdapter();
    const closed = await adapter.getClosedPositions();
    this.syncClosedTradesToBayesianScorecards(closed);
    return closed;
  }

  public async getClosedPositions(brokerId?: BrokerId): Promise<BrokerClosedPosition[]> {
    const adapter = brokerId ? (this.adapters[brokerId] || this.getActiveAdapter()) : this.getActiveAdapter();
    const closed = await adapter.getClosedPositions();
    this.syncClosedTradesToBayesianScorecards(closed);
    return closed;
  }

  public getAuditLogs(): ExecutionAuditLog[] {
    return [...this.auditLogs];
  }

  /**
   * Evaluates Chief Arbiter output and automatically executes order on active broker
   * if Auto-Execution is enabled and all institutional risk gates pass.
   */
  public async evaluateAndAutoExecute(
    arbiter: ArbiterOutput,
    snapshot: FeatureSnapshot
  ): Promise<BrokerOrderResult | null> {
    const activeConf = brokerVault.getActiveBroker();

    // 1. Check if auto execution is toggled on for active broker
    if (!activeConf.isAutoExecutionEnabled) {
      return null;
    }

    // 2. Gate check: Must be BUY or SELL
    if (arbiter.final_recommendation === 'NO_TRADE') {
      return null;
    }

    // 3. Gate check: R:R must be >= 1.5
    if (arbiter.risk_reward < 1.5) {
      console.log(`[BrokerManager] Auto-execution skipped: R:R ${arbiter.risk_reward} < 1.5`);
      return null;
    }

    // 4. Gate check: Tradability gate
    if (!snapshot.indicators.tradable) {
      console.log(`[BrokerManager] Auto-execution skipped: Market flagged untradable by Volatility Gate`);
      return null;
    }

    // 5. Cooldown check: Prevent duplicate spam within 10 minutes on same symbol
    const lastTime = this.lastExecutedSymbolTimestamps.get(arbiter.symbol) || 0;
    if (Date.now() - lastTime < 10 * 60 * 1000) {
      console.log(`[BrokerManager] Auto-execution cooldown active for ${arbiter.symbol}`);
      return null;
    }

    // 6. Fetch live account summary and open positions
    const adapter = this.getActiveAdapter();
    const [summary, openPositions] = await Promise.all([
      this.getActiveAccountSummary(),
      adapter.getOpenPositions(),
    ]);

    // 6a. Daily Drawdown Circuit Breaker Check
    if (summary.isCircuitBreakerActive) {
      console.warn(
        `[BrokerManager] Daily Drawdown Circuit Breaker active (${summary.dailyDrawdownPct}%). Auto-execution paused.`
      );
      return null;
    }

    // 6b. Duplicate symbol check (Strict institutional rule: maximum 1 trade per instrument)
    const targetSymbol = getTerminalSymbolFromBroker(arbiter.symbol, activeConf.id);
    if (
      openPositions.some(
        (p) => getTerminalSymbolFromBroker(p.symbol, p.brokerId) === targetSymbol
      )
    ) {
      console.log(
        `[BrokerManager] Symbol ${targetSymbol} already has active open position on ${activeConf.name}. Strict 1 trade per instrument rule enforced.`
      );
      return null;
    }

    const direction = arbiter.final_recommendation as 'BUY' | 'SELL';
    const baseRiskPct = activeConf.defaultRiskPct || 1.0;
    const tradeRiskPct = Number((baseRiskPct * (arbiter.size_modifier || 1.0)).toFixed(2));
    const maxHeat = activeConf.maxPortfolioHeatPct || 3.0;

    // 6c. Portfolio Heat Cap Check (Max 3.0% aggregate open risk)
    if ((summary.portfolioHeatPct || 0) + tradeRiskPct > maxHeat) {
      console.log(
        `[BrokerManager] Portfolio Heat Guard blocked ${arbiter.symbol}: Current heat ${summary.portfolioHeatPct}% + ${tradeRiskPct}% > ${maxHeat}% max.`
      );
      return null;
    }

    // 6d. Correlated Directional Exposure Check (Max 2 correlated positions)
    const correlatedCount = openPositions.filter((p) =>
      areInstrumentsCorrelated(p.symbol, p.direction, arbiter.symbol, direction)
    ).length;
    if (correlatedCount >= 2) {
      console.log(
        `[BrokerManager] Correlation Guard blocked ${arbiter.symbol} (${direction}): ${correlatedCount} correlated positions already open.`
      );
      return null;
    }

    // 7. Spread-Aware Entry & Stop-Loss Padding (1.5x spread buffer)
    const def = getInstrumentDefinition(arbiter.symbol);
    const digits = def?.digits ?? 5;
    const liveSpread = snapshot.spread > 0 ? snapshot.spread : def?.minSpread || 0.0001;
    const entryPrice = (arbiter.entry_zone[0] + arbiter.entry_zone[1]) / 2;
    const rawStopDist = Math.abs(entryPrice - arbiter.stop_loss);

    // Reject if live spread is abnormally wide (> 25% of total Stop Loss distance)
    if (rawStopDist > 0 && liveSpread > rawStopDist * 0.25) {
      console.log(
        `[BrokerManager] Spread Guard blocked ${arbiter.symbol}: Live spread (${liveSpread}) > 25% of SL distance (${rawStopDist}).`
      );
      return null;
    }

    const spreadPadding = liveSpread * 1.5;
    const paddedStopLoss = Number(
      (direction === 'BUY'
        ? arbiter.stop_loss - spreadPadding
        : arbiter.stop_loss + spreadPadding
      ).toFixed(digits)
    );

    // 8. Calculate exact units from live Broker Equity and Risk %
    const riskMetrics = calculateRiskBasedOrderMetrics(
      arbiter.symbol,
      activeConf.id,
      summary.equity || 10000,
      tradeRiskPct,
      entryPrice,
      paddedStopLoss,
      arbiter.take_profit[0]
    );

    const orderRequest: StandardizedOrderRequest = {
      brokerId: activeConf.id,
      symbol: arbiter.symbol,
      direction,
      orderType: 'MARKET',
      units: riskMetrics.units,
      riskPct: riskMetrics.riskPct,
      riskCapitalUsd: riskMetrics.riskCapitalUsd,
      entryPrice,
      stopLoss: paddedStopLoss,
      takeProfit1: arbiter.take_profit[0],
      takeProfit2: arbiter.take_profit[1],
      riskReward: arbiter.risk_reward,
      clientOrderId: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: 'AUTO_ARBITER',
    };

    console.log(`[BrokerManager] Executing Auto-Trade on ${activeConf.name}:`, orderRequest);
    const result = await adapter.placeOrder(orderRequest);

    this.lastExecutedSymbolTimestamps.set(arbiter.symbol, Date.now());

    // Record audit log
    const log: ExecutionAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      brokerId: activeConf.id,
      symbol: arbiter.symbol,
      direction: orderRequest.direction,
      units: orderRequest.units,
      riskPct: orderRequest.riskPct,
      riskCapitalUsd: orderRequest.riskCapitalUsd,
      entryPrice: result.fillPrice,
      stopLoss: orderRequest.stopLoss,
      takeProfit: orderRequest.takeProfit1,
      riskReward: orderRequest.riskReward,
      status: result.success ? 'FILLED' : 'REJECTED',
      source: 'AUTO_ARBITER',
      message: result.message,
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 50) this.auditLogs = this.auditLogs.slice(0, 50);

    return result;
  }

  /**
   * Manual order execution — enforces Risk-Percentage Position Sizing from live broker equity
   */
  public async executeManualOrder(order: StandardizedOrderRequest): Promise<BrokerOrderResult> {
    const adapter = this.adapters[order.brokerId] || this.getActiveAdapter();
    const conf = brokerVault.getConfig(order.brokerId);
    const summary = await adapter.getAccountSummary();

    // Resolve live entry price if not explicitly set
    let refEntryPrice = order.entryPrice || 0;
    if (!refEntryPrice || refEntryPrice <= 0) {
      try {
        const { fetchLiveMarketQuote } = await import('../data/marketDataService');
        const q = await fetchLiveMarketQuote(order.symbol);
        if (q && q.price > 0) {
          refEntryPrice = order.direction === 'BUY' ? q.ask : q.bid;
        }
      } catch {
        // Fallback
      }
    }

    // Validate directional Stop Loss orientation before calculating sizing or dispatching
    if (order.stopLoss > 0 && refEntryPrice > 0) {
      if (order.direction === 'BUY' && order.stopLoss >= refEntryPrice) {
        return {
          success: false,
          brokerId: order.brokerId,
          symbol: order.symbol,
          direction: order.direction,
          units: order.units,
          fillPrice: 0,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit1,
          timestamp: Date.now(),
          status: 'REJECTED',
          message: `Order rejected: Stop Loss (${order.stopLoss}) must be strictly below Entry Price (${refEntryPrice}) for BUY.`,
        };
      }
      if (order.direction === 'SELL' && order.stopLoss <= refEntryPrice) {
        return {
          success: false,
          brokerId: order.brokerId,
          symbol: order.symbol,
          direction: order.direction,
          units: order.units,
          fillPrice: 0,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit1,
          timestamp: Date.now(),
          status: 'REJECTED',
          message: `Order rejected: Stop Loss (${order.stopLoss}) must be strictly above Entry Price (${refEntryPrice}) for SELL.`,
        };
      }
    }

    // Strict institutional limit: Maximum 1 open trade per instrument allowed
    const targetSymbol = getTerminalSymbolFromBroker(order.symbol, order.brokerId);
    const openPositions = await adapter.getOpenPositions();
    const existing = openPositions.find(
      (p) => getTerminalSymbolFromBroker(p.symbol, p.brokerId) === targetSymbol
    );
    if (existing) {
      return {
        success: false,
        brokerId: order.brokerId,
        symbol: order.symbol,
        direction: order.direction,
        units: order.units,
        fillPrice: 0,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit1,
        timestamp: Date.now(),
        status: 'REJECTED',
        message: `Order rejected: Position on ${targetSymbol} is already open (#${existing.brokerTicketId}). Strict institutional limit: maximum 1 trade per instrument allowed.`,
      };
    }

    const riskPct = order.riskPct && order.riskPct > 0 ? order.riskPct : conf.defaultRiskPct || 1.0;

    if (refEntryPrice > 0 && order.stopLoss > 0) {
      const metrics = calculateRiskBasedOrderMetrics(
        order.symbol,
        order.brokerId,
        summary.equity || 10000,
        riskPct,
        refEntryPrice,
        order.stopLoss,
        order.takeProfit1
      );
      order.units = metrics.units;
      order.riskPct = metrics.riskPct;
      order.riskCapitalUsd = metrics.riskCapitalUsd;
      order.entryPrice = refEntryPrice;
    }

    const result = await adapter.placeOrder(order);

    const log: ExecutionAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      brokerId: order.brokerId,
      symbol: order.symbol,
      direction: order.direction,
      units: order.units,
      riskPct: order.riskPct,
      riskCapitalUsd: order.riskCapitalUsd,
      entryPrice: result.fillPrice || refEntryPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit1,
      riskReward: order.riskReward,
      status: result.success ? 'FILLED' : 'REJECTED',
      source: order.source || 'MANUAL_TICKET',
      message: result.message,
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 50) this.auditLogs = this.auditLogs.slice(0, 50);

    return result;
  }

  /**
   * 1-Click or Automated Move Stop-Loss to Breakeven (+small spread cushion)
   */
  public async movePositionToBreakeven(
    brokerId: BrokerId,
    ticketId: string
  ): Promise<{ success: boolean; message: string; newStopLoss?: number }> {
    const adapter = this.adapters[brokerId] || this.getActiveAdapter();
    const positions = await adapter.getOpenPositions();
    const pos = positions.find((p) => p.brokerTicketId === ticketId);

    if (!pos) {
      return { success: false, message: `Open position #${ticketId} not found.` };
    }

    const def = getInstrumentDefinition(pos.symbol);
    const digits = def?.digits ?? 5;
    const cushion = (def?.minSpread || 0.0001) * 0.5;
    const newStopLoss = Number(
      (pos.direction === 'BUY' ? pos.openPrice + cushion : pos.openPrice - cushion).toFixed(digits)
    );

    if (adapter.modifyPosition) {
      const res = await adapter.modifyPosition(ticketId, {
        stopLoss: newStopLoss,
        isBreakevenLocked: true,
      });
      if (res.success) {
        this.auditLogs.unshift({
          id: `audit-be-${Date.now()}`,
          timestamp: Date.now(),
          brokerId: pos.brokerId,
          symbol: pos.symbol,
          direction: pos.direction,
          units: pos.units,
          riskPct: 0,
          riskCapitalUsd: 0,
          entryPrice: pos.openPrice,
          stopLoss: newStopLoss,
          takeProfit: pos.takeProfit,
          riskReward: 0,
          status: 'FILLED',
          source: 'AUTO_ARBITER',
          message: `Stop Loss locked at Breakeven (${newStopLoss}) for ${pos.symbol} #${ticketId}`,
        });
      }
      return { ...res, newStopLoss };
    }

    return { success: false, message: `Adapter ${brokerId} does not support SL modification.` };
  }

  public async moveToBreakeven(
    brokerId: BrokerId,
    ticketId: string
  ): Promise<{ success: boolean; message: string; newStopLoss?: number }> {
    return this.movePositionToBreakeven(brokerId, ticketId);
  }

  /**
   * Background Breakeven & Trailing Stop Manager:
   * Automatically shifts Stop Loss to Breakeven once an open position reaches >= +1.0R.
   */
  public async manageOpenPositionsBreakeven(): Promise<string[]> {
    const activeConf = brokerVault.getActiveBroker();
    const adapter = this.getActiveAdapter();
    const positions = await adapter.getOpenPositions();
    const actions: string[] = [];

    for (const pos of positions) {
      const alreadyBe =
        pos.isBreakevenLocked ||
        (pos.stopLoss > 0 &&
          ((pos.direction === 'BUY' && pos.stopLoss >= pos.openPrice) ||
            (pos.direction === 'SELL' && pos.stopLoss <= pos.openPrice)));

      if (!alreadyBe && pos.unrealizedPnLR >= 1.0) {
        const res = await this.movePositionToBreakeven(activeConf.id, pos.brokerTicketId);
        if (res.success) {
          actions.push(`${pos.symbol} #${pos.brokerTicketId} -> SL moved to BE (${res.newStopLoss})`);
        }
      }
    }

    return actions;
  }

  public async closePosition(brokerId: BrokerId, ticketId: string): Promise<{ success: boolean; message: string }> {
    const adapter = this.adapters[brokerId] || this.getActiveAdapter();
    const res = await adapter.closePosition(ticketId);
    // Sync closed positions to Bayesian scorecards immediately
    const closed = await adapter.getClosedPositions();
    this.syncClosedTradesToBayesianScorecards(closed);
    return res;
  }

  public async flattenAllActive(): Promise<{ closedCount: number; errors: string[] }> {
    const adapter = this.getActiveAdapter();
    const res = await adapter.flattenAll();
    const closed = await adapter.getClosedPositions();
    this.syncClosedTradesToBayesianScorecards(closed);
    return res;
  }

  /**
   * 1-Click Institutional Clean Up: Detects duplicate positions on the same instrument,
   * retains strictly 1 position per asset (keeping the newest position active),
   * and automatically closes all extraneous duplicate trades.
   */
  public async closeDuplicatePositions(brokerId?: BrokerId): Promise<{
    success: boolean;
    closedCount: number;
    message: string;
    closedPositions: { ticketId: string; symbol: string }[];
  }> {
    const adapter = brokerId ? (this.adapters[brokerId] || this.getActiveAdapter()) : this.getActiveAdapter();
    const positions = await adapter.getOpenPositions();

    // Group positions by canonical terminal symbol
    const grouped = new Map<string, typeof positions>();
    for (const pos of positions) {
      const canonical = getTerminalSymbolFromBroker(pos.symbol, pos.brokerId);
      if (!grouped.has(canonical)) {
        grouped.set(canonical, []);
      }
      grouped.get(canonical)!.push(pos);
    }

    const closedPositions: { ticketId: string; symbol: string }[] = [];
    let closedCount = 0;

    for (const [sym, posList] of grouped.entries()) {
      if (posList.length > 1) {
        // Sort descending by openedAt to keep the newest position active
        posList.sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
        const toKeep = posList[0];
        const duplicatesToClose = posList.slice(1);

        console.log(
          `[BrokerManager] Duplicate positions detected for ${sym} (${posList.length} trades). Keeping #${toKeep.brokerTicketId}, closing ${duplicatesToClose.length} duplicates.`
        );

        for (const dup of duplicatesToClose) {
          try {
            const res = await adapter.closePosition(dup.brokerTicketId);
            if (res.success) {
              closedCount++;
              closedPositions.push({ ticketId: dup.brokerTicketId, symbol: dup.symbol });
              this.auditLogs.unshift({
                id: `audit-cleanup-${Date.now()}-${dup.brokerTicketId}`,
                timestamp: Date.now(),
                brokerId: dup.brokerId,
                symbol: dup.symbol,
                direction: dup.direction,
                units: dup.units,
                entryPrice: dup.openPrice,
                status: 'CLOSED',
                source: 'CLEANUP_DUPLICATES',
                message: `Cleaned up duplicate position #${dup.brokerTicketId} on ${sym}. Strictly 1 trade per instrument enforced.`,
              });
            }
          } catch (err: any) {
            console.error(`[BrokerManager] Failed to close duplicate #${dup.brokerTicketId}:`, err);
          }
        }
      }
    }

    // Sync closed positions to Bayesian scorecards immediately if any trades were closed
    if (closedCount > 0) {
      const closed = await adapter.getClosedPositions();
      this.syncClosedTradesToBayesianScorecards(closed);
    }

    return {
      success: true,
      closedCount,
      message:
        closedCount > 0
          ? `Successfully closed ${closedCount} duplicate position(s). Enforced 1 trade per instrument rule.`
          : 'No duplicate positions found. All open trades are unique per instrument.',
      closedPositions,
    };
  }
}

export const brokerManager = new BrokerManager();

