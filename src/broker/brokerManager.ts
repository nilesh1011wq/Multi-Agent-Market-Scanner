import {
  BrokerAccountSummary,
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
import { calculateBrokerLotSize } from './symbolMapper';
import { ArbiterOutput } from '../types/debate';
import { FeatureSnapshot } from '../types/market';

export interface ExecutionAuditLog {
  id: string;
  timestamp: number;
  brokerId: BrokerId;
  symbol: string;
  direction: 'BUY' | 'SELL';
  units: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  status: 'FILLED' | 'REJECTED' | 'FAILED';
  source: 'AUTO_ARBITER' | 'MANUAL_TICKET' | 'SCANNER';
  message: string;
}

class BrokerManager {
  private adapters: Record<BrokerId, IBrokerAdapter>;
  private auditLogs: ExecutionAuditLog[] = [];
  private lastExecutedSymbolTimestamps: Map<string, number> = new Map();

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

  public async getActiveAccountSummary(): Promise<BrokerAccountSummary> {
    const adapter = this.getActiveAdapter();
    return adapter.getAccountSummary();
  }

  public async getActiveOpenPositions(): Promise<BrokerPosition[]> {
    const adapter = this.getActiveAdapter();
    return adapter.getOpenPositions();
  }

  public getAuditLogs(): ExecutionAuditLog[] {
    return [...this.auditLogs];
  }

  /**
   * Evaluates Chief Arbiter output and automatically executes order on active broker
   * if Auto-Execution is enabled and risk gates pass.
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

    // 6. Check open positions on active broker for this symbol
    const adapter = this.getActiveAdapter();
    const openPositions = await adapter.getOpenPositions();
    if (openPositions.some((p) => p.symbol === arbiter.symbol)) {
      console.log(`[BrokerManager] Symbol ${arbiter.symbol} already has active open position on ${activeConf.name}`);
      return null;
    }

    // 7. Calculate position size using broker account balance and 1% risk
    const summary = await adapter.getAccountSummary();
    const entryPrice = (arbiter.entry_zone[0] + arbiter.entry_zone[1]) / 2;
    const riskDistance = Math.abs(entryPrice - arbiter.stop_loss);

    const units = calculateBrokerLotSize(
      arbiter.symbol,
      activeConf.id,
      summary.equity || 10000,
      0.01 * (arbiter.size_modifier || 1.0),
      riskDistance
    );

    const orderRequest: StandardizedOrderRequest = {
      brokerId: activeConf.id,
      symbol: arbiter.symbol,
      direction: arbiter.final_recommendation as 'BUY' | 'SELL',
      orderType: 'MARKET',
      units,
      entryPrice,
      stopLoss: arbiter.stop_loss,
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
   * Manual order execution
   */
  public async executeManualOrder(order: StandardizedOrderRequest): Promise<BrokerOrderResult> {
    const adapter = this.adapters[order.brokerId] || this.getActiveAdapter();
    const result = await adapter.placeOrder(order);

    const log: ExecutionAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      brokerId: order.brokerId,
      symbol: order.symbol,
      direction: order.direction,
      units: order.units,
      entryPrice: result.fillPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit1,
      riskReward: order.riskReward,
      status: result.success ? 'FILLED' : 'REJECTED',
      source: order.source,
      message: result.message,
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 50) this.auditLogs = this.auditLogs.slice(0, 50);

    return result;
  }

  public async closePosition(brokerId: BrokerId, ticketId: string): Promise<{ success: boolean; message: string }> {
    const adapter = this.adapters[brokerId] || this.getActiveAdapter();
    return adapter.closePosition(ticketId);
  }

  public async flattenAllActive(): Promise<{ closedCount: number; errors: string[] }> {
    const adapter = this.getActiveAdapter();
    return adapter.flattenAll();
  }
}

export const brokerManager = new BrokerManager();
