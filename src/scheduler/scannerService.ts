import { Timeframe } from '../types/market';
import { RankedOpportunity } from '../types/scanner';
import { marketDataService, WATCHLIST } from '../data/marketDataService';
import { buildFeatureSnapshot } from '../quant/snapshot';
import { queryHistoricalAnalogs } from '../analogs/analogEngine';
import { getCOTData } from '../analogs/cotEngine';
import { runFullDebate } from '../agents/debateOrchestrator';
import { scorecardService } from '../backtest/scorecards';
import { alertService } from './alertService';

class ScannerService {
  private cachedOpportunities: RankedOpportunity[] = [];
  private isScanning: boolean = false;
  private lastScanTime: number = 0;

  constructor() {
    this.seedInitialOpportunities();
  }

  public getRankedOpportunities(): RankedOpportunity[] {
    return [...this.cachedOpportunities];
  }

  public getLastScanTime(): number {
    return this.lastScanTime;
  }

  public getIsScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Deterministic Cheap Pre-Filter (NO LLM)
   * Prevents invoking heavy debate rounds on dead chop or blackout periods
   */
  public preFilterMarket(indicators: any): { passed: boolean; reason: string } {
    if (indicators.tradable === false) {
      return { passed: false, reason: 'Market marked untradable by Quant Engine' };
    }

    const adx = indicators.adx14 ?? indicators.adx ?? 20;
    const atrPercentile = indicators.volatilityPercentile1Y ?? indicators.atrPercentile ?? 50;

    if (adx < 16 && atrPercentile < 25) {
      return { passed: false, reason: `Low Momentum Chop (ADX ${adx.toFixed(1)} < 16, ATR ${atrPercentile.toFixed(0)}%)` };
    }

    if (indicators.regime === 'chop' && Math.abs(indicators.distEma20InAtr || 0) < 0.3) {
      return { passed: false, reason: 'Sideways Mean Contraction (Indecisive EMA Compression)' };
    }

    return { passed: true, reason: 'Tradable Momentum & Structure Detected' };
  }

  /**
   * Scan a single symbol and timeframe
   */
  public async scanSymbol(symbol: string, timeframe: Timeframe = 'H1'): Promise<RankedOpportunity> {
    const candles = await marketDataService.getCandles(symbol, timeframe, 120);
    const snapshot = buildFeatureSnapshot(symbol, timeframe, candles);
    const analogs = queryHistoricalAnalogs(snapshot);
    const cot = getCOTData(symbol);

    const preFilter = this.preFilterMarket(snapshot.indicators);

    // If pre-filter strictly fails, return a quick NO_TRADE opportunity without heavy LLM costs
    if (!preFilter.passed) {
      const price = snapshot.currentPrice;
      const atr = snapshot.indicators.atr14;
      const noTradeOpp: RankedOpportunity = {
        id: `opp-${symbol}-${timeframe}-${Date.now()}`,
        symbol,
        timeframe,
        direction: 'NO_TRADE',
        confidence: 25,
        convictionScore: 20,
        entryZone: [price - 0.2 * atr, price + 0.2 * atr],
        stopLoss: price - 1.5 * atr,
        takeProfits: [price + 1.5 * atr, price + 3.0 * atr],
        riskReward: 1.0,
        evidenceBadge: analogs.sampleSize >= 30 ? 'B' : 'C',
        regime: snapshot.indicators.regime,
        consensus: { buy: 2, sell: 2, neutral: 6 },
        riskManagerApproval: 'VETO',
        arbiterSummary: `Pre-Filter Gated: ${preFilter.reason}. Standing aside to conserve capital.`,
        detectedAt: Date.now(),
        preFilterPassed: false,
        preFilterReason: preFilter.reason,
        invalidationLevel: price,
      };
      return noTradeOpp;
    }

    // Run Full 3-Round Specialist Debate & Chief Arbiter Synthesis
    const agentScorecards = scorecardService.getScorecards(symbol, timeframe);
    const debate = await runFullDebate({
      snapshot,
      analogs,
      cot,
      agentScorecards,
    });

    const arb = debate.arbiter;
    const votes = Object.values(debate.round1);
    const buyCount = votes.filter((v: any) => v.direction === 'BUY').length;
    const sellCount = votes.filter((v: any) => v.direction === 'SELL').length;
    const neutralCount = votes.filter((v: any) => v.direction === 'NEUTRAL').length;

    const consensusMax = Math.max(buyCount, sellCount);
    const badgeBonus = arb.evidence_quality.badge === 'A' ? 15 : arb.evidence_quality.badge === 'B' ? 8 : 0;
    const rrBonus = Math.min(arb.risk_reward, 3.0) * 5;
    const directionBonus = arb.final_recommendation !== 'NO_TRADE' ? 10 : 0;
    const convictionScore = Math.min(
      99,
      Math.max(
        10,
        Math.round(
          arb.confidence * 0.45 +
            (consensusMax / 10) * 25 +
            badgeBonus +
            rrBonus +
            directionBonus
        )
      )
    );

    const rmDecision = (debate.round1['Risk Manager'] as any)?.decision || 'APPROVED';
    const riskApproval = rmDecision === 'VETO' ? 'VETO' : rmDecision === 'REDUCE_SIZE' ? 'REDUCE_SIZE' : 'APPROVED';

    const opp: RankedOpportunity = {
      id: `opp-${symbol}-${timeframe}-${Date.now()}`,
      symbol,
      timeframe,
      direction: arb.final_recommendation,
      confidence: arb.confidence,
      convictionScore,
      entryZone: arb.entry_zone,
      stopLoss: arb.stop_loss,
      takeProfits: [arb.take_profit[0], arb.take_profit[1]],
      riskReward: arb.risk_reward,
      evidenceBadge: arb.evidence_quality.badge,
      regime: snapshot.indicators.regime,
      consensus: {
        buy: buyCount,
        sell: sellCount,
        neutral: neutralCount,
      },
      riskManagerApproval: riskApproval,
      arbiterSummary: arb.rationale,
      detectedAt: Date.now(),
      preFilterPassed: true,
      preFilterReason: 'Active setup validated by 10-Agent Chamber',
      invalidationLevel: parseFloat(arb.invalidation) || arb.stop_loss,
    };

    // If Auto-Execution is enabled on active broker and gates pass, dispatch order immediately
    try {
      const { brokerManager } = await import('../broker/brokerManager');
      await brokerManager.evaluateAndAutoExecute(arb, snapshot);
    } catch (brokerErr: any) {
      console.warn(`[Scanner] Auto-trade dispatch notice for ${symbol}:`, brokerErr.message);
    }

    // If eligible, dispatch alert
    await alertService.evaluateAndDispatch(opp);

    return opp;
  }

  /**
   * Scan entire watchlist of 12 assets
   */
  public async scanAll(timeframe: Timeframe = 'H1'): Promise<RankedOpportunity[]> {
    if (this.isScanning) {
      return this.cachedOpportunities;
    }

    this.isScanning = true;
    const results: RankedOpportunity[] = [];

    try {
      for (const item of WATCHLIST) {
        try {
          const opp = await this.scanSymbol(item.symbol, timeframe);
          results.push(opp);
        } catch (err) {
          console.error(`Error scanning ${item.symbol}:`, err);
        }
      }

      // Sort descending: BUY/SELL first by convictionScore, then NO_TRADE
      results.sort((a, b) => {
        if (a.direction !== 'NO_TRADE' && b.direction === 'NO_TRADE') return -1;
        if (a.direction === 'NO_TRADE' && b.direction !== 'NO_TRADE') return 1;
        return b.convictionScore - a.convictionScore;
      });

      this.cachedOpportunities = results;
      this.lastScanTime = Date.now();
      return results;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Seed realistic initial opportunities for immediate responsive UI display
   */
  private seedInitialOpportunities(): void {
    this.cachedOpportunities = [
      {
        id: 'seed-xauusd-h1',
        symbol: 'XAUUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 86,
        convictionScore: 92,
        entryZone: [2732.5, 2735.0],
        stopLoss: 2718.0,
        takeProfits: [2758.0, 2780.0],
        riskReward: 2.3,
        evidenceBadge: 'A',
        regime: 'trend_bull',
        consensus: { buy: 8, sell: 1, neutral: 1 },
        riskManagerApproval: 'APPROVED',
        arbiterSummary:
          'Strong confluence across D1/H4/H1 trend alignment with COT commercial net long accumulation at 84th percentile. Analog engine hit rate 64.7% (N=42).',
        detectedAt: Date.now() - 15 * 60 * 1000,
        preFilterPassed: true,
        preFilterReason: 'High ADX Momentum (ADX 28.4), Clean S/R cluster bounce',
        invalidationLevel: 2718.0,
      },
      {
        id: 'seed-eurusd-h1',
        symbol: 'EURUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 82,
        convictionScore: 88,
        entryZone: [1.0845, 1.0855],
        stopLoss: 1.0815,
        takeProfits: [1.0910, 1.0965],
        riskReward: 2.2,
        evidenceBadge: 'A',
        regime: 'trend_bull',
        consensus: { buy: 7, sell: 1, neutral: 2 },
        riskManagerApproval: 'APPROVED',
        arbiterSummary:
          'Breakout and retest of pivot PP with EMA 20/50 golden cross. Risk manager approved with 2.2 R:R at 1.0% portfolio risk.',
        detectedAt: Date.now() - 25 * 60 * 1000,
        preFilterPassed: true,
        preFilterReason: 'Tradable Momentum (ADX 26.2), EMA ribbon alignment',
        invalidationLevel: 1.0815,
      },
      {
        id: 'seed-wti-h1',
        symbol: 'WTI',
        timeframe: 'H1',
        direction: 'SELL',
        confidence: 79,
        convictionScore: 84,
        entryZone: [71.80, 72.20],
        stopLoss: 73.10,
        takeProfits: [69.80, 68.20],
        riskReward: 2.05,
        evidenceBadge: 'B',
        regime: 'trend_bear',
        consensus: { buy: 1, sell: 7, neutral: 2 },
        riskManagerApproval: 'APPROVED',
        arbiterSummary:
          'Bearish order block rejection at R1 pivot. Intermarket weakness with DXY bounce and inventory build.',
        detectedAt: Date.now() - 40 * 60 * 1000,
        preFilterPassed: true,
        preFilterReason: 'Bearish trend continuation, ADX 24.8',
        invalidationLevel: 73.10,
      },
      {
        id: 'seed-gbpusd-h1',
        symbol: 'GBPUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 76,
        convictionScore: 80,
        entryZone: [1.2980, 1.2995],
        stopLoss: 1.2940,
        takeProfits: [1.3070, 1.3140],
        riskReward: 1.88,
        evidenceBadge: 'B',
        regime: 'range',
        consensus: { buy: 6, sell: 2, neutral: 2 },
        riskManagerApproval: 'APPROVED',
        arbiterSummary:
          'Support rebound at S1 pivot cluster with bullish engulfing bar on H1. R:R meets minimum threshold.',
        detectedAt: Date.now() - 55 * 60 * 1000,
        preFilterPassed: true,
        preFilterReason: 'Range floor bounce with volume expansion',
        invalidationLevel: 1.2940,
      },
      {
        id: 'seed-usdjpy-h1',
        symbol: 'USDJPY',
        timeframe: 'H1',
        direction: 'NO_TRADE',
        confidence: 42,
        convictionScore: 45,
        entryZone: [154.20, 154.50],
        stopLoss: 153.60,
        takeProfits: [155.80, 156.40],
        riskReward: 1.4,
        evidenceBadge: 'C',
        regime: 'chop',
        consensus: { buy: 3, sell: 3, neutral: 4 },
        riskManagerApproval: 'VETO',
        arbiterSummary:
          'Split consensus (3 vs 3) and sub-1.5 R:R ratio. Risk Manager exercised veto authority over verbal intervention risks.',
        detectedAt: Date.now() - 65 * 60 * 1000,
        preFilterPassed: false,
        preFilterReason: 'Sideways Mean Contraction (Indecisive EMA Compression)',
        invalidationLevel: 153.60,
      },
      {
        id: 'seed-xagusd-h1',
        symbol: 'XAGUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 75,
        convictionScore: 78,
        entryZone: [32.10, 32.25],
        stopLoss: 31.60,
        takeProfits: [33.20, 33.90],
        riskReward: 2.1,
        evidenceBadge: 'B',
        regime: 'trend_bull',
        consensus: { buy: 6, sell: 2, neutral: 2 },
        riskManagerApproval: 'APPROVED',
        arbiterSummary:
          'Silver sympathetic rally with Gold; industrial demand narrative and COT non-commercial accumulation.',
        detectedAt: Date.now() - 75 * 60 * 1000,
        preFilterPassed: true,
        preFilterReason: 'Bullish breakout above prior 24h high',
        invalidationLevel: 31.60,
      },
    ];
    this.lastScanTime = Date.now() - 15 * 60 * 1000;
  }
}

export const scannerService = new ScannerService();
