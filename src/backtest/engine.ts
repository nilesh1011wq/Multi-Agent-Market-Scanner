import { Candle, Timeframe } from '../types/market';
import { AgentName } from '../types/debate';
import { computeTechnicalIndicators } from '../quant/snapshot';
import { AgentScorecard, EquityCurvePoint } from '../types/scorecard';

export interface BacktestTrade {
  agentName: AgentName;
  symbol: string;
  timeframe: Timeframe;
  entryIndex: number;
  entryTimestamp: number;
  entryPrice: number;
  direction: 'BUY' | 'SELL';
  stopLoss: number;
  takeProfit: number;
  exitIndex: number;
  exitTimestamp: number;
  exitPrice: number;
  result: 'WIN' | 'LOSS' | 'EXPIRED';
  rMultiple: number; // Return in units of risk (R)
  isOutOfSample: boolean;
}

export interface AgentBacktestSummary {
  agentName: AgentName;
  symbol: string;
  timeframe: Timeframe;
  totalTrades: number;
  wins: number;
  losses: number;
  hitRate: number;
  avgR: number;
  profitFactor: number;
  maxDrawdownR: number;
  inSampleHitRate: number;
  outOfSampleHitRate: number;
  bayesianWeight: number;
  trades: BacktestTrade[];
}

/**
 * Deterministic signal evaluation per agent.
 * Strict quantitative code (NO LLM), ensuring anti-bias historical integrity.
 */
function evaluateDeterministicAgentSignal(
  agentName: AgentName,
  candlesSlice: Candle[],
  timeframe: Timeframe
): 'BUY' | 'SELL' | 'NEUTRAL' {
  if (candlesSlice.length < 35) return 'NEUTRAL';
  const ind = computeTechnicalIndicators(candlesSlice, timeframe);

  switch (agentName) {
    case 'Trend & Momentum':
      if (ind.ema20 > ind.ema50 && (ind.macd.histogram >= 0 || ind.adx14 >= 18)) return 'BUY';
      if (ind.ema20 < ind.ema50 && (ind.macd.histogram <= 0 || ind.adx14 >= 18)) return 'SELL';
      return ind.emaStack === 'BULLISH' ? 'BUY' : ind.emaStack === 'BEARISH' ? 'SELL' : 'NEUTRAL';

    case 'Mean Reversion':
      if (ind.regime === 'range' || Math.abs(ind.distEma20InAtr) > 2.0) {
        if (ind.rsi14 <= 30 || ind.distEma20InAtr < -2.0) return 'BUY';
        if (ind.rsi14 >= 70 || ind.distEma20InAtr > 2.0) return 'SELL';
      }
      return 'NEUTRAL';

    case 'Price Action & S/R':
      if (ind.patterns.bullishEngulfing || ind.patterns.pinBar === 'BULLISH') return 'BUY';
      if (ind.patterns.bearishEngulfing || ind.patterns.pinBar === 'BEARISH') return 'SELL';
      return 'NEUTRAL';

    case 'Volatility & Regime':
      if (ind.bollingerBands.bandwidth < 0.03 && ind.adx14 > 22) {
        return ind.ema20 > ind.ema50 ? 'BUY' : 'SELL';
      }
      return 'NEUTRAL';

    case 'Market Structure & Volume':
      if (ind.swingStructure.bos) {
        return ind.swingStructure.structure === 'BULLISH' ? 'BUY' : 'SELL';
      }
      if (ind.swingStructure.liquiditySweep) {
        return ind.swingStructure.liquiditySweep === 'BUY_SIDE' ? 'SELL' : 'BUY';
      }
      return 'NEUTRAL';

    case 'Macro & Fundamental':
      return ind.ema200 && candlesSlice[candlesSlice.length - 1].close > ind.ema200 ? 'BUY' : 'SELL';

    case 'News & Sentiment':
      // Momentum breakout on volume expansion
      return ind.patterns.insideBar && ind.adx14 > 20 ? (ind.distEma20InAtr > 0 ? 'BUY' : 'SELL') : 'NEUTRAL';

    case 'Intermarket':
      return ind.stochK > ind.stochD && ind.rsi14 > 50 ? 'BUY' : ind.stochK < ind.stochD && ind.rsi14 < 50 ? 'SELL' : 'NEUTRAL';

    case 'Positioning & Seasonality':
      if (ind.rsi14 < 35 && ind.distEma20InAtr < -1.5) return 'BUY';
      if (ind.rsi14 > 65 && ind.distEma20InAtr > 1.5) return 'SELL';
      return 'NEUTRAL';

    case 'Risk Manager':
      return 'NEUTRAL'; // Risk manager structures trades rather than predicting direction

    default:
      return 'NEUTRAL';
  }
}

/**
 * Walk-Forward Backtesting Harness.
 * Evaluates trade performance with In-Sample (70%) vs Out-of-Sample (30%) splits.
 */
export function runWalkForwardBacktest(
  agentName: AgentName,
  symbol: string,
  timeframe: Timeframe,
  candles: Candle[],
  inSampleRatio = 0.70
): AgentBacktestSummary {
  const trades: BacktestTrade[] = [];
  const minWarmup = 40;
  const splitIndex = Math.floor(candles.length * inSampleRatio);

  for (let i = minWarmup; i < candles.length - 10; i += 3) {
    const slice = candles.slice(0, i + 1);
    const signal = evaluateDeterministicAgentSignal(agentName, slice, timeframe);
    if (signal === 'NEUTRAL') continue;

    const currentCandle = candles[i];
    const entryPrice = currentCandle.close;
    const atr = Math.max(0.001, (currentCandle.high - currentCandle.low) * 1.5);
    const isOutOfSample = i >= splitIndex;

    const stopDistance = atr * 1.5;
    const targetDistance = atr * 2.5; // Target 1 : 1.67 R:R

    const stopLoss = signal === 'BUY' ? entryPrice - stopDistance : entryPrice + stopDistance;
    const takeProfit = signal === 'BUY' ? entryPrice + targetDistance : entryPrice - targetDistance;

    // Simulate forward bars up to 15 bars holding period
    let exitIndex = Math.min(candles.length - 1, i + 15);
    let exitPrice = candles[exitIndex].close;
    let result: 'WIN' | 'LOSS' | 'EXPIRED' = 'EXPIRED';
    let rMultiple = 0;

    for (let j = i + 1; j <= exitIndex; j++) {
      const bar = candles[j];
      if (signal === 'BUY') {
        if (bar.low <= stopLoss) {
          result = 'LOSS';
          exitIndex = j;
          exitPrice = stopLoss;
          rMultiple = -1.0;
          break;
        }
        if (bar.high >= takeProfit) {
          result = 'WIN';
          exitIndex = j;
          exitPrice = takeProfit;
          rMultiple = targetDistance / stopDistance;
          break;
        }
      } else {
        if (bar.high >= stopLoss) {
          result = 'LOSS';
          exitIndex = j;
          exitPrice = stopLoss;
          rMultiple = -1.0;
          break;
        }
        if (bar.low <= takeProfit) {
          result = 'WIN';
          exitIndex = j;
          exitPrice = takeProfit;
          rMultiple = targetDistance / stopDistance;
          break;
        }
      }
    }

    if (result === 'EXPIRED') {
      const finalDiff = signal === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice;
      rMultiple = Math.round((finalDiff / stopDistance) * 100) / 100;
      result = rMultiple > 0 ? 'WIN' : 'LOSS';
    }

    trades.push({
      agentName,
      symbol,
      timeframe,
      entryIndex: i,
      entryTimestamp: currentCandle.timestamp,
      entryPrice,
      direction: signal,
      stopLoss,
      takeProfit,
      exitIndex,
      exitTimestamp: candles[exitIndex].timestamp,
      exitPrice,
      result,
      rMultiple,
      isOutOfSample,
    });
  }

  // Calculate Performance Metrics
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const losses = trades.filter((t) => t.result === 'LOSS').length;
  const hitRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) / 100 : 0.5;

  const totalR = trades.reduce((acc, t) => acc + t.rMultiple, 0);
  const avgR = totalTrades > 0 ? Math.round((totalR / totalTrades) * 100) / 100 : 0.0;

  const grossProfitR = trades.filter((t) => t.rMultiple > 0).reduce((acc, t) => acc + t.rMultiple, 0);
  const grossLossR = Math.abs(trades.filter((t) => t.rMultiple < 0).reduce((acc, t) => acc + t.rMultiple, 0));
  const profitFactor = grossLossR > 0 ? Math.round((grossProfitR / grossLossR) * 100) / 100 : 1.5;

  // Max Drawdown in R
  let peakR = 0;
  let cumR = 0;
  let maxDDR = 0;
  for (const t of trades) {
    cumR += t.rMultiple;
    if (cumR > peakR) peakR = cumR;
    const dd = peakR - cumR;
    if (dd > maxDDR) maxDDR = dd;
  }

  // In-Sample vs Out-of-Sample metrics
  const inSampleTrades = trades.filter((t) => !t.isOutOfSample);
  const outOfSampleTrades = trades.filter((t) => t.isOutOfSample);

  const inSampleWins = inSampleTrades.filter((t) => t.result === 'WIN').length;
  const outOfSampleWins = outOfSampleTrades.filter((t) => t.result === 'WIN').length;

  const inSampleHitRate = inSampleTrades.length > 0 ? Math.round((inSampleWins / inSampleTrades.length) * 100) / 100 : 0.5;
  const outOfSampleHitRate = outOfSampleTrades.length > 0 ? Math.round((outOfSampleWins / outOfSampleTrades.length) * 100) / 100 : inSampleHitRate;

  // Bayesian Dynamic Weight
  // Base 1.0, adjusted by Out-of-Sample Hit Rate and Avg R
  let bayesianWeight = 1.0;
  if (outOfSampleTrades.length >= 10) {
    const hitRateRatio = outOfSampleHitRate / 0.50;
    const rMultiplier = 1 + Math.max(-0.4, Math.min(0.4, avgR * 0.2));
    bayesianWeight = Math.round(hitRateRatio * rMultiplier * 100) / 100;
    bayesianWeight = Math.max(0.3, Math.min(2.5, bayesianWeight));
  } else {
    // Under 10 trades: cap weight at 0.7 (unproven)
    bayesianWeight = 0.7;
  }

  return {
    agentName,
    symbol,
    timeframe,
    totalTrades,
    wins,
    losses,
    hitRate,
    avgR,
    profitFactor,
    maxDrawdownR: Math.round(maxDDR * 100) / 100,
    inSampleHitRate,
    outOfSampleHitRate,
    bayesianWeight,
    trades,
  };
}

/**
 * Builds cumulative equity curve from historical trades.
 */
export function buildEquityCurve(trades: BacktestTrade[]): EquityCurvePoint[] {
  let cumR = 0;
  let wins = 0;
  const curve: EquityCurvePoint[] = [];

  const sortedTrades = [...trades].sort((a, b) => a.exitTimestamp - b.exitTimestamp);

  for (let i = 0; i < sortedTrades.length; i++) {
    const t = sortedTrades[i];
    cumR += t.rMultiple;
    if (t.result === 'WIN') wins++;

    curve.push({
      timestamp: t.exitTimestamp,
      cumulativeR: Math.round(cumR * 100) / 100,
      tradesCount: i + 1,
      winRate: Math.round((wins / (i + 1)) * 100) / 100,
    });
  }

  return curve;
}
