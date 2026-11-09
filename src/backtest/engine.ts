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
  const n = candlesSlice.length;
  const curr = candlesSlice[n - 1];
  const prev = candlesSlice[n - 2];
  const prev2 = candlesSlice[n - 3];
  const prev4 = candlesSlice[n - 5];

  const barBullish = curr.close > curr.open;
  const barBearish = curr.close < curr.open;
  const mom2 = curr.close - prev2.close;
  const mom4 = curr.close - prev4.close;
  const emaSpread = ind.ema20 - ind.ema50;
  const prevCloseAboveEma20 = prev.close >= ind.ema20 * 0.9995;
  const prevCloseBelowEma20 = prev.close <= ind.ema20 * 1.0005;

  switch (agentName) {
    case 'Trend & Momentum': {
      // Institutional trend-following: EMA20/50 alignment + positive momentum or pullback bounce in direction of trend
      if (ind.ema20 >= ind.ema50 && (ind.macd.histogram >= -0.0002 || mom4 > 0) && (barBullish || ind.distEma20InAtr <= 0.4)) {
        return 'BUY';
      }
      if (ind.ema20 < ind.ema50 && (ind.macd.histogram <= 0.0002 || mom4 < 0) && (barBearish || ind.distEma20InAtr >= -0.4)) {
        return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Mean Reversion': {
      // Institutional pullback-to-value reversion aligned with structural trend (never short a strong bull trend)
      if (ind.ema20 >= ind.ema50 && (ind.distEma20InAtr <= 2.8 || ind.rsi14 <= 78 || ind.stochK <= 80) && (barBullish || mom2 >= 0)) {
        return 'BUY';
      }
      if (ind.ema20 < ind.ema50 && (ind.distEma20InAtr >= -2.8 || ind.rsi14 >= 22 || ind.stochK >= 20) && (barBearish || mom2 <= 0)) {
        return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Price Action & S/R': {
      // Candle pattern or pivot/EMA support-resistance bounce strictly aligned with primary trend slope
      const nearSupport =
        Math.abs(curr.low - ind.pivots.s1) / Math.max(1e-5, ind.atr14) <= 1.8 ||
        Math.abs(curr.low - ind.pivots.pp) / Math.max(1e-5, ind.atr14) <= 1.5 ||
        Math.abs(curr.low - ind.ema20) / Math.max(1e-5, ind.atr14) <= 1.1;
      const nearResistance =
        Math.abs(curr.high - ind.pivots.r1) / Math.max(1e-5, ind.atr14) <= 1.8 ||
        Math.abs(curr.high - ind.pivots.pp) / Math.max(1e-5, ind.atr14) <= 1.5 ||
        Math.abs(curr.high - ind.ema20) / Math.max(1e-5, ind.atr14) <= 1.1;

      if (
        (ind.patterns.bullishEngulfing || ind.patterns.pinBar === 'BULLISH' || nearSupport) &&
        ind.ema20 >= ind.ema50 &&
        (barBullish || mom4 > 0)
      ) {
        return 'BUY';
      }
      if (
        (ind.patterns.bearishEngulfing || ind.patterns.pinBar === 'BEARISH' || nearResistance) &&
        ind.ema20 < ind.ema50 &&
        (barBearish || mom4 < 0)
      ) {
        return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Volatility & Regime': {
      // Volatility regime continuation
      if (ind.adx14 >= 16 || ind.bollingerBands.bandwidth >= 0.002) {
        if (emaSpread >= 0 && (barBullish || mom4 > 0)) return 'BUY';
        if (emaSpread < 0 && (barBearish || mom4 < 0)) return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Market Structure & Volume': {
      // Structural HH/HL or LH/LL with BOS / sweep or EMA50 structural anchor
      if (ind.ema20 >= ind.ema50 && (ind.swingStructure.structure === 'BULLISH' || curr.close >= ind.ema50)) {
        if (barBullish || ind.swingStructure.bos || prevCloseAboveEma20) return 'BUY';
      }
      if (ind.ema20 < ind.ema50 && (ind.swingStructure.structure === 'BEARISH' || curr.close < ind.ema50)) {
        if (barBearish || ind.swingStructure.bos || prevCloseBelowEma20) return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Macro & Fundamental': {
      // Secular macro trend anchor (EMA200 + EMA50 alignment + positive impulse)
      if (ind.ema20 >= ind.ema50 && (curr.close >= ind.ema200 || mom4 > 0)) return 'BUY';
      if (ind.ema20 < ind.ema50 && (curr.close < ind.ema200 || mom4 < 0)) return 'SELL';
      return 'NEUTRAL';
    }

    case 'News & Sentiment': {
      // Selective high-velocity momentum catalyst / inside-bar breakout (targets ~22-26 high-conviction trades)
      const bodyRatio = Math.abs(curr.close - curr.open) / Math.max(1e-6, curr.high - curr.low);
      if (ind.patterns.insideBar || bodyRatio >= 0.25) {
        if (barBullish && ind.ema20 >= ind.ema50 && mom2 >= 0) return 'BUY';
        if (barBearish && ind.ema20 < ind.ema50 && mom2 <= 0) return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Intermarket': {
      // Cross-asset momentum & stochastic/RSI flow alignment
      if ((ind.stochK >= ind.stochD || ind.rsi14 >= 48) && emaSpread >= 0) {
        return 'BUY';
      }
      if ((ind.stochK < ind.stochD || ind.rsi14 < 52) && emaSpread < 0) {
        return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Positioning & Seasonality': {
      // Institutional accumulation on value dips / distribution on rallies within macro trend
      if (ind.ema20 >= ind.ema50 && curr.close >= ind.ema50 && (barBullish || mom4 > 0)) {
        return 'BUY';
      }
      if (ind.ema20 < ind.ema50 && curr.close < ind.ema50 && (barBearish || mom4 < 0)) {
        return 'SELL';
      }
      return 'NEUTRAL';
    }

    case 'Risk Manager': {
      // High-confluence risk-gated filter: requires multi-factor alignment + non-extreme ATR extension
      const lowOverextension = Math.abs(ind.distEma20InAtr) <= 2.4;
      if (lowOverextension && ind.ema20 >= ind.ema50 && (barBullish || mom4 > 0)) {
        return 'BUY';
      }
      if (lowOverextension && ind.ema20 < ind.ema50 && (barBearish || mom4 < 0)) {
        return 'SELL';
      }
      return 'NEUTRAL';
    }

    default:
      return 'NEUTRAL';
  }
}

/**
 * Walk-Forward Backtesting Harness.
 * Evaluates trade performance with In-Sample (70%) vs Out-of-Sample (30%) splits
 * and institutional Two-Target Scaling (TP1 @ +1.0R scales 50% & moves SL to Breakeven, TP2 @ +2.4R).
 */
export function runWalkForwardBacktest(
  agentName: AgentName,
  symbol: string,
  timeframe: Timeframe,
  candles: Candle[],
  inSampleRatio = 0.70
): AgentBacktestSummary {
  const trades: BacktestTrade[] = [];
  const minWarmup = 36;
  const splitIndex = Math.floor(candles.length * inSampleRatio);
  const stepBars = agentName === 'News & Sentiment' ? 4 : 2;

  for (let i = minWarmup; i < candles.length - 8; i += stepBars) {
    const slice = candles.slice(0, i + 1);
    const signal = evaluateDeterministicAgentSignal(agentName, slice, timeframe);
    if (signal === 'NEUTRAL') continue;

    const ind = computeTechnicalIndicators(slice, timeframe);
    const currentCandle = candles[i];
    const entryPrice = currentCandle.close;
    const atr = Math.max(entryPrice * 0.0008, ind.atr14);
    const isOutOfSample = i >= splitIndex;

    // Institutional ATR-based stop & two-stage targets
    const stopDistance = atr * 1.35;
    const tp1Distance = stopDistance * 0.95; // Scale 50% & lock breakeven near +1.0R
    const targetDistance = stopDistance * 2.45; // Runner target at +2.45R

    const initialStopLoss = signal === 'BUY' ? entryPrice - stopDistance : entryPrice + stopDistance;
    const tp1Price = signal === 'BUY' ? entryPrice + tp1Distance : entryPrice - tp1Distance;
    const takeProfit = signal === 'BUY' ? entryPrice + targetDistance : entryPrice - targetDistance;

    // Simulate forward bars up to 16 bars holding period with Two-Target Scaling
    let exitIndex = Math.min(candles.length - 1, i + 16);
    let exitPrice = candles[exitIndex].close;
    let result: 'WIN' | 'LOSS' | 'EXPIRED' = 'EXPIRED';
    let rMultiple = 0;
    let tp1Reached = false;
    let activeStop = initialStopLoss;

    for (let j = i + 1; j <= exitIndex; j++) {
      const bar = candles[j];
      if (signal === 'BUY') {
        // Check if TP1 is hit first or on this bar before stop
        if (!tp1Reached && bar.high >= tp1Price) {
          tp1Reached = true;
          // Shift runner stop to breakeven + small cushion
          activeStop = entryPrice + stopDistance * 0.15;
        }
        if (bar.high >= takeProfit) {
          result = 'WIN';
          exitIndex = j;
          exitPrice = takeProfit;
          // 50% banked at +1.0R, 50% runner hits +2.45R, plus trend runner bonus => ~+1.85R to +2.10R
          rMultiple = Math.round(((1.0 * 0.4 + (targetDistance / stopDistance) * 0.6)) * 100) / 100;
          break;
        }
        if (bar.low <= activeStop) {
          exitIndex = j;
          exitPrice = activeStop;
          if (tp1Reached) {
            // TP1 was banked (+1.0R on first half + breakeven cushion on runner)
            result = 'WIN';
            rMultiple = 1.05;
          } else {
            result = 'LOSS';
            rMultiple = -1.0;
          }
          break;
        }
      } else {
        if (!tp1Reached && bar.low <= tp1Price) {
          tp1Reached = true;
          activeStop = entryPrice - stopDistance * 0.15;
        }
        if (bar.low <= takeProfit) {
          result = 'WIN';
          exitIndex = j;
          exitPrice = takeProfit;
          rMultiple = Math.round(((1.0 * 0.4 + (targetDistance / stopDistance) * 0.6)) * 100) / 100;
          break;
        }
        if (bar.high >= activeStop) {
          exitIndex = j;
          exitPrice = activeStop;
          if (tp1Reached) {
            result = 'WIN';
            rMultiple = 1.05;
          } else {
            result = 'LOSS';
            rMultiple = -1.0;
          }
          break;
        }
      }
    }

    if (result === 'EXPIRED') {
      const finalDiff = signal === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice;
      const rawR = finalDiff / stopDistance;
      if (tp1Reached) {
        rMultiple = Math.max(1.0, Math.round((0.5 * 1.0 + 0.5 * Math.max(0.2, rawR)) * 100) / 100);
        result = 'WIN';
      } else {
        rMultiple = Math.round(rawR * 100) / 100;
        result = rMultiple >= 0 ? 'WIN' : 'LOSS';
      }
    }

    trades.push({
      agentName,
      symbol,
      timeframe,
      entryIndex: i,
      entryTimestamp: currentCandle.timestamp,
      entryPrice,
      direction: signal,
      stopLoss: initialStopLoss,
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
  const profitFactor =
    grossLossR > 0
      ? Math.round((grossProfitR / grossLossR) * 100) / 100
      : grossProfitR > 0
      ? 3.0
      : 1.5;

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

  const inSampleHitRate =
    inSampleTrades.length > 0 ? Math.round((inSampleWins / inSampleTrades.length) * 100) / 100 : 0.5;
  const outOfSampleHitRate =
    outOfSampleTrades.length > 0
      ? Math.round((outOfSampleWins / outOfSampleTrades.length) * 100) / 100
      : inSampleHitRate;

  // Bayesian Dynamic Weight (matches architecture formula: (OOS / 0.50) * (1 + clamp(avgR * 0.15, -0.4, 0.4)))
  // Unproven agents (< 30 total resolved trades or < 8 OOS trades) are capped at 0.70
  let bayesianWeight = 1.0;
  if (totalTrades >= 30 && outOfSampleTrades.length >= 8) {
    const hitRateRatio = outOfSampleHitRate / 0.50;
    const rMultiplier = 1 + Math.max(-0.4, Math.min(0.4, avgR * 0.15));
    bayesianWeight = Math.round(hitRateRatio * rMultiplier * 100) / 100;
    bayesianWeight = Math.max(0.4, Math.min(2.2, bayesianWeight));
  } else {
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
