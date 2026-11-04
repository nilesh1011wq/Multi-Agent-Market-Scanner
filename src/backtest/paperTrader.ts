import { PaperPosition, PaperAccountSummary, RankedOpportunity } from '../types/scanner';
import { AgentName } from '../types/debate';
import { RecommendationRecord } from '../types/scorecard';
import { scorecardService } from './scorecards';
import { marketDataService } from '../data/marketDataService';

class PaperTrader {
  private balance: number = 10000; // Starting virtual balance: $10,000
  private positions: PaperPosition[] = [];
  private closedPositions: PaperPosition[] = [];

  constructor() {
    this.seedInitialTrades();
  }

  public getOpenPositions(): PaperPosition[] {
    return [...this.positions];
  }

  public getClosedPositions(): PaperPosition[] {
    return [...this.closedPositions].reverse();
  }

  public getAccountSummary(): PaperAccountSummary {
    let unrealizedPnLUsd = 0;
    for (const pos of this.positions) {
      // 1R = 1% of starting balance = $100
      unrealizedPnLUsd += pos.unrealizedPnLR * 100;
    }
    const equity = this.balance + unrealizedPnLUsd;

    const totalClosed = this.closedPositions.length;
    const wins = this.closedPositions.filter((p) => p.realizedPnLR > 0).length;
    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;

    let totalRealizedR = 0;
    let peakR = 0;
    let maxDrawdownR = 0;
    let runningR = 0;

    for (const p of this.closedPositions) {
      totalRealizedR += p.realizedPnLR;
      runningR += p.realizedPnLR;
      if (runningR > peakR) peakR = runningR;
      const dd = peakR - runningR;
      if (dd > maxDrawdownR) maxDrawdownR = dd;
    }

    return {
      balance: Math.round(this.balance * 100) / 100,
      equity: Math.round(equity * 100) / 100,
      startingBalance: 10000,
      openPositionsCount: this.positions.length,
      closedTradesCount: totalClosed,
      winRate: Math.round(winRate * 10) / 10,
      totalRealizedR: Math.round(totalRealizedR * 100) / 100,
      maxDrawdownR: Math.round(maxDrawdownR * 100) / 100,
    };
  }

  /**
   * Open a new paper trade from a recommendation
   */
  public openPositionFromOpportunity(
    opp: RankedOpportunity,
    agentVotes?: Record<AgentName, 'BUY' | 'SELL' | 'NEUTRAL'>
  ): PaperPosition | null {
    if (opp.direction === 'NO_TRADE') return null;

    // Check if symbol already has active position
    const existing = this.positions.find((p) => p.symbol === opp.symbol);
    if (existing) {
      return existing;
    }

    const entryPrice = (opp.entryZone[0] + opp.entryZone[1]) / 2;
    const riskDistance = Math.abs(entryPrice - opp.stopLoss);
    // 1% risk of $10,000 = $100
    const riskAmount = this.balance * 0.01;
    const lotSize = riskDistance > 0 ? Math.round((riskAmount / riskDistance) * 100) / 100 : 1;

    // Default agent votes if not provided
    const votes: Record<AgentName, 'BUY' | 'SELL' | 'NEUTRAL'> = agentVotes || {
      'Trend & Momentum': opp.direction === 'BUY' ? 'BUY' : 'SELL',
      'Mean Reversion': opp.direction === 'BUY' ? 'BUY' : 'NEUTRAL',
      'Price Action & S/R': opp.direction === 'BUY' ? 'BUY' : 'SELL',
      'Volatility & Regime': opp.direction === 'BUY' ? 'BUY' : 'SELL',
      'Market Structure & Volume': opp.direction === 'BUY' ? 'BUY' : 'SELL',
      'Macro & Fundamental': opp.direction === 'BUY' ? 'BUY' : 'NEUTRAL',
      'News & Sentiment': opp.direction === 'BUY' ? 'BUY' : 'SELL',
      'Intermarket': opp.direction === 'BUY' ? 'BUY' : 'SELL',
      'Positioning & Seasonality': opp.direction === 'BUY' ? 'BUY' : 'NEUTRAL',
      'Risk Manager': opp.direction === 'BUY' ? 'BUY' : 'SELL',
    };

    const newPos: PaperPosition = {
      id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol: opp.symbol,
      timeframe: opp.timeframe,
      direction: opp.direction as 'BUY' | 'SELL',
      entryPrice,
      currentPrice: entryPrice,
      stopLoss: opp.stopLoss,
      takeProfit1: opp.takeProfits[0],
      takeProfit2: opp.takeProfits[1],
      riskReward: opp.riskReward,
      lotSize,
      status: 'ACTIVE',
      realizedPnLR: 0,
      unrealizedPnLR: 0,
      openedAt: Date.now(),
      agentVotesAtOpen: votes,
      evidenceBadge: opp.evidenceBadge,
      notes: opp.arbiterSummary.slice(0, 100),
    };

    this.positions.push(newPos);
    return newPos;
  }

  /**
   * Close a position manually
   */
  public closePosition(positionId: string, reason: string = 'MANUALLY_CLOSED'): PaperPosition | null {
    const idx = this.positions.findIndex((p) => p.id === positionId);
    if (idx === -1) return null;

    const pos = this.positions[idx];
    pos.status = 'CLOSED';
    pos.closedAt = Date.now();
    pos.exitPrice = pos.currentPrice;
    pos.realizedPnLR = pos.unrealizedPnLR;
    pos.notes = `${pos.notes} (${reason})`;

    // Update account balance (1R = $100)
    this.balance += pos.realizedPnLR * 100;

    // Remove from open, add to closed
    this.positions.splice(idx, 1);
    this.closedPositions.push(pos);

    // Dynamic Bayesian Weight Update in Scorecard Service!
    this.feedResolutionToScorecard(pos);

    return pos;
  }

  /**
   * Simulate a tick / price step across all active positions
   * Checks for TP1 (+1R & move SL to BE), TP2 (+2.2R), and SL (-1R)
   */
  public async simulateMarketTick(): Promise<{ updated: number; resolved: PaperPosition[] }> {
    const resolved: PaperPosition[] = [];
    const remaining: PaperPosition[] = [];

    for (const pos of this.positions) {
      // Get latest candle or generate a drift based on asset ATR
      let latestPrice = pos.currentPrice;
      try {
        const candles = await marketDataService.getCandles(pos.symbol, pos.timeframe, 5);
        if (candles.length > 0) {
          latestPrice = candles[candles.length - 1].close;
        }
      } catch {
        // Fallback simulation drift
      }

      // Add a simulated realistic market tick (±0.25% drift with slight edge)
      const randomFactor = (Math.random() - 0.45) * (pos.direction === 'BUY' ? 0.003 : -0.003);
      const simulatedPrice = latestPrice * (1 + randomFactor);
      pos.currentPrice = Math.round(simulatedPrice * 100000) / 100000;

      const riskDist = Math.abs(pos.entryPrice - pos.stopLoss);
      const hadHitTp1 = pos.status === 'TP1_HIT';

      if (pos.direction === 'BUY') {
        pos.unrealizedPnLR =
          riskDist > 0 ? (pos.currentPrice - pos.entryPrice) / riskDist : 0;

        // Check TP2 (Full Win)
        if (pos.currentPrice >= pos.takeProfit2) {
          pos.status = 'TP2_HIT';
          pos.closedAt = Date.now();
          pos.exitPrice = pos.takeProfit2;
          pos.realizedPnLR = pos.riskReward; // e.g. +2.2R
          pos.unrealizedPnLR = 0;
          this.balance += pos.realizedPnLR * 100;
          resolved.push(pos);
          this.feedResolutionToScorecard(pos);
          continue;
        }

        // Check TP1 (Scale 50% + Breakeven stop)
        if (pos.currentPrice >= pos.takeProfit1 && pos.status === 'ACTIVE') {
          pos.status = 'TP1_HIT';
          pos.stopLoss = pos.entryPrice; // Move SL to Breakeven
          pos.realizedPnLR += 1.0; // Bank +1R on scaled portion
          this.balance += 100;
          pos.notes = 'TP1 reached: +1.0R locked, Stop Loss shifted to Breakeven.';
        }

        // Check Stop Loss
        if (pos.currentPrice <= pos.stopLoss) {
          pos.status = 'STOPPED_OUT';
          pos.closedAt = Date.now();
          pos.exitPrice = pos.stopLoss;
          pos.realizedPnLR = hadHitTp1 ? 0.0 : -1.0;
          pos.unrealizedPnLR = 0;
          this.balance += (pos.realizedPnLR === -1.0 ? -100 : 0);
          resolved.push(pos);
          this.feedResolutionToScorecard(pos);
          continue;
        }
      } else {
        // SELL
        pos.unrealizedPnLR =
          riskDist > 0 ? (pos.entryPrice - pos.currentPrice) / riskDist : 0;

        // Check TP2 (Full Win)
        if (pos.currentPrice <= pos.takeProfit2) {
          pos.status = 'TP2_HIT';
          pos.closedAt = Date.now();
          pos.exitPrice = pos.takeProfit2;
          pos.realizedPnLR = pos.riskReward;
          pos.unrealizedPnLR = 0;
          this.balance += pos.realizedPnLR * 100;
          resolved.push(pos);
          this.feedResolutionToScorecard(pos);
          continue;
        }

        // Check TP1
        if (pos.currentPrice <= pos.takeProfit1 && pos.status === 'ACTIVE') {
          pos.status = 'TP1_HIT';
          pos.stopLoss = pos.entryPrice; // Breakeven
          pos.realizedPnLR += 1.0;
          this.balance += 100;
          pos.notes = 'TP1 reached: +1.0R locked, Stop Loss shifted to Breakeven.';
        }

        // Check Stop Loss
        if (pos.currentPrice >= pos.stopLoss) {
          pos.status = 'STOPPED_OUT';
          pos.closedAt = Date.now();
          pos.exitPrice = pos.stopLoss;
          pos.realizedPnLR = hadHitTp1 ? 0.0 : -1.0;
          pos.unrealizedPnLR = 0;
          this.balance += (pos.realizedPnLR === -1.0 ? -100 : 0);
          resolved.push(pos);
          this.feedResolutionToScorecard(pos);
          continue;
        }
      }

      pos.unrealizedPnLR = Math.round(pos.unrealizedPnLR * 100) / 100;
      remaining.push(pos);
    }

    this.positions = remaining;
    this.closedPositions.push(...resolved);

    return {
      updated: remaining.length,
      resolved,
    };
  }

  /**
   * Feed trade resolution into scorecardService to dynamically update Bayesian weights
   */
  private feedResolutionToScorecard(pos: PaperPosition): void {
    const outcome = pos.realizedPnLR > 0 ? 'WIN' : 'LOSS';
    const rec: RecommendationRecord = {
      id: pos.id,
      symbol: pos.symbol,
      timeframe: pos.timeframe,
      recommendation: pos.direction,
      confidence: 80,
      entryZone: [pos.entryPrice, pos.entryPrice],
      stopLoss: pos.stopLoss,
      takeProfit1: pos.takeProfit1,
      takeProfit2: pos.takeProfit2,
      riskReward: pos.riskReward,
      evidenceBadge: pos.evidenceBadge,
      status: outcome === 'WIN' ? 'TP1_HIT' : 'SL_HIT',
      openedAt: pos.openedAt,
      resolvedAt: pos.closedAt || Date.now(),
      actualReturnR: pos.realizedPnLR,
      consensusLevel: 'strong',
      rationale: pos.notes,
    };

    const participatingAgents = (Object.keys(pos.agentVotesAtOpen) as AgentName[]).filter(
      (agent) => pos.agentVotesAtOpen[agent] === pos.direction
    );

    scorecardService.recordTradeResolution(
      rec,
      outcome,
      pos.realizedPnLR,
      participatingAgents
    );
  }

  /**
   * Seed realistic initial trades
   */
  private seedInitialTrades(): void {
    // 1 Active position
    this.positions.push({
      id: 'paper-active-1',
      symbol: 'XAUUSD',
      timeframe: 'H1',
      direction: 'BUY',
      entryPrice: 2733.8,
      currentPrice: 2742.5,
      stopLoss: 2718.0,
      takeProfit1: 2758.0,
      takeProfit2: 2780.0,
      riskReward: 2.3,
      lotSize: 0.63,
      status: 'ACTIVE',
      realizedPnLR: 0,
      unrealizedPnLR: 0.55,
      openedAt: Date.now() - 4 * 3600 * 1000,
      agentVotesAtOpen: {
        'Trend & Momentum': 'BUY',
        'Mean Reversion': 'NEUTRAL',
        'Price Action & S/R': 'BUY',
        'Volatility & Regime': 'BUY',
        'Market Structure & Volume': 'BUY',
        'Macro & Fundamental': 'BUY',
        'News & Sentiment': 'BUY',
        'Intermarket': 'BUY',
        'Positioning & Seasonality': 'BUY',
        'Risk Manager': 'BUY',
      },
      evidenceBadge: 'A',
      notes: 'Strong confluence D1/H4/H1 trend alignment with commercial COT accumulation.',
    });

    // 3 Closed historical paper positions
    this.closedPositions.push(
      {
        id: 'paper-closed-1',
        symbol: 'EURUSD',
        timeframe: 'H1',
        direction: 'BUY',
        entryPrice: 1.082,
        currentPrice: 1.0895,
        exitPrice: 1.0895,
        stopLoss: 1.079,
        takeProfit1: 1.087,
        takeProfit2: 1.0895,
        riskReward: 2.5,
        lotSize: 3.33,
        status: 'TP2_HIT',
        realizedPnLR: 2.5,
        unrealizedPnLR: 0,
        openedAt: Date.now() - 28 * 3600 * 1000,
        closedAt: Date.now() - 14 * 3600 * 1000,
        agentVotesAtOpen: {
          'Trend & Momentum': 'BUY',
          'Mean Reversion': 'NEUTRAL',
          'Price Action & S/R': 'BUY',
          'Volatility & Regime': 'BUY',
          'Market Structure & Volume': 'BUY',
          'Macro & Fundamental': 'BUY',
          'News & Sentiment': 'BUY',
          'Intermarket': 'NEUTRAL',
          'Positioning & Seasonality': 'BUY',
          'Risk Manager': 'BUY',
        },
        evidenceBadge: 'A',
        notes: 'Target 2 hit cleanly on European morning momentum continuation.',
      },
      {
        id: 'paper-closed-2',
        symbol: 'WTI',
        timeframe: 'H1',
        direction: 'SELL',
        entryPrice: 72.1,
        currentPrice: 70.15,
        exitPrice: 70.15,
        stopLoss: 73.2,
        takeProfit1: 70.8,
        takeProfit2: 69.8,
        riskReward: 2.1,
        lotSize: 0.91,
        status: 'TP1_HIT',
        realizedPnLR: 1.0,
        unrealizedPnLR: 0,
        openedAt: Date.now() - 48 * 3600 * 1000,
        closedAt: Date.now() - 32 * 3600 * 1000,
        agentVotesAtOpen: {
          'Trend & Momentum': 'SELL',
          'Mean Reversion': 'SELL',
          'Price Action & S/R': 'SELL',
          'Volatility & Regime': 'SELL',
          'Market Structure & Volume': 'SELL',
          'Macro & Fundamental': 'NEUTRAL',
          'News & Sentiment': 'SELL',
          'Intermarket': 'SELL',
          'Positioning & Seasonality': 'SELL',
          'Risk Manager': 'SELL',
        },
        evidenceBadge: 'B',
        notes: 'TP1 reached (+1.0R banked), stopped out at Breakeven on EIA inventory rebound.',
      },
      {
        id: 'paper-closed-3',
        symbol: 'USDJPY',
        timeframe: 'H1',
        direction: 'BUY',
        entryPrice: 153.8,
        currentPrice: 153.15,
        exitPrice: 153.15,
        stopLoss: 153.15,
        takeProfit1: 154.9,
        takeProfit2: 155.6,
        riskReward: 1.9,
        lotSize: 1.54,
        status: 'STOPPED_OUT',
        realizedPnLR: -1.0,
        unrealizedPnLR: 0,
        openedAt: Date.now() - 72 * 3600 * 1000,
        closedAt: Date.now() - 58 * 3600 * 1000,
        agentVotesAtOpen: {
          'Trend & Momentum': 'BUY',
          'Mean Reversion': 'SELL',
          'Price Action & S/R': 'BUY',
          'Volatility & Regime': 'NEUTRAL',
          'Market Structure & Volume': 'BUY',
          'Macro & Fundamental': 'BUY',
          'News & Sentiment': 'NEUTRAL',
          'Intermarket': 'BUY',
          'Positioning & Seasonality': 'SELL',
          'Risk Manager': 'BUY',
        },
        evidenceBadge: 'B',
        notes: 'Stopped out at 1R risk threshold following verbal intervention headlines.',
      }
    );

    // Initial balance updated with past realized PnL
    this.balance = 10000 + (2.5 + 1.0 - 1.0) * 100; // $10,250
  }
}

export const paperTrader = new PaperTrader();
