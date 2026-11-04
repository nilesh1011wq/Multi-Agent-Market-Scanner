import {
  Candle,
  FeatureSnapshot,
  MultiTimeframeSnapshot,
  TechnicalIndicators,
  Timeframe,
} from '../types/market';
import {
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateStochastic,
} from './indicators';
import { detectCandlePatterns } from './patterns';
import { classifyRegime } from './regime';
import { clusterSRLevels, calculatePivots, evaluateMarketStructure } from './structure';

/**
 * Computes the full deterministic TechnicalIndicators block from raw candles for a single timeframe.
 */
export function computeTechnicalIndicators(
  candles: Candle[],
  timeframe: Timeframe,
  historical1YAtRs?: number[],
  historical10YAtRs?: number[]
): TechnicalIndicators {
  const len = candles.length;
  if (len < 30) {
    throw new Error(`Insufficient candle count (${len}) for timeframe ${timeframe}. Need at least 30.`);
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, Math.min(200, Math.floor(len * 0.9)));

  const ema20 = ema20Arr[len - 1];
  const ema50 = ema50Arr[len - 1];
  const ema200 = ema200Arr[len - 1];

  let emaStack: 'BULLISH' | 'BEARISH' | 'MIXED' = 'MIXED';
  if (ema20 > ema50 && ema50 > ema200) emaStack = 'BULLISH';
  else if (ema20 < ema50 && ema50 < ema200) emaStack = 'BEARISH';

  const rsiArr = calculateRSI(closes, 14);
  const rsi14 = Math.round((rsiArr[len - 1] ?? 50) * 10) / 10;

  const { stochK: stochKArr, stochD: stochDArr } = calculateStochastic(highs, lows, closes, 14, 3, 3);
  const stochK = Math.round((stochKArr[len - 1] ?? 50) * 10) / 10;
  const stochD = Math.round((stochDArr[len - 1] ?? 50) * 10) / 10;

  const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9);
  const macd = {
    line: Math.round((macdLine[len - 1] ?? 0) * 100000) / 100000,
    signal: Math.round((signalLine[len - 1] ?? 0) * 100000) / 100000,
    histogram: Math.round((histogram[len - 1] ?? 0) * 100000) / 100000,
  };

  const { adx: adxArr } = calculateADX(candles, 14);
  const adx14 = Math.round((adxArr[len - 1] ?? 20) * 10) / 10;

  const atrArr = calculateATR(candles, 14);
  const atr14 = Math.round((atrArr[len - 1] ?? 0.001) * 100000) / 100000;

  const distEma20InAtr = atr14 > 0 ? Math.round(((closes[len - 1] - ema20) / atr14) * 10) / 10 : 0;

  const bb = calculateBollingerBands(closes, 20, 2);
  const bollingerBands = {
    upper: Math.round(bb.upper[len - 1] * 10000) / 10000,
    middle: Math.round(bb.middle[len - 1] * 10000) / 10000,
    lower: Math.round(bb.lower[len - 1] * 10000) / 10000,
    bandwidth: Math.round(bb.bandwidth[len - 1] * 10000) / 10000,
    percentB: Math.round(bb.percentB[len - 1] * 100) / 100,
  };

  // Volatility percentiles
  let volatilityPercentile1Y = 50;
  let volatilityPercentile10Y = 50;

  if (historical1YAtRs && historical1YAtRs.length > 0) {
    const belowCount = historical1YAtRs.filter((v) => v < atr14).length;
    volatilityPercentile1Y = Math.round((belowCount / historical1YAtRs.length) * 100);
  } else {
    // Approximate percentile using recent ATRs
    const validAtrs = atrArr.filter((a) => !isNaN(a));
    const belowCount = validAtrs.filter((v) => v < atr14).length;
    volatilityPercentile1Y = Math.round((belowCount / validAtrs.length) * 100);
  }
  volatilityPercentile10Y = volatilityPercentile1Y;

  // Pivots & Structure
  const prevBar = candles[len - 2] ?? candles[len - 1];
  const pivots = calculatePivots(prevBar.high, prevBar.low, prevBar.close);
  const srClusters = clusterSRLevels(candles, timeframe, atr14, 0.6).slice(0, 6);
  const swingStructure = evaluateMarketStructure(candles, timeframe);
  const patterns = detectCandlePatterns(candles);

  const { regime, tradable } = classifyRegime(
    adx14,
    ema20,
    ema50,
    ema200,
    bollingerBands.bandwidth,
    volatilityPercentile1Y,
    swingStructure.structure,
    candles
  );

  return {
    ema20: Math.round(ema20 * 10000) / 10000,
    ema50: Math.round(ema50 * 10000) / 10000,
    ema200: Math.round(ema200 * 10000) / 10000,
    emaStack,
    distEma20InAtr,
    rsi14,
    stochK,
    stochD,
    macd,
    adx14,
    atr14,
    bollingerBands,
    volatilityPercentile1Y,
    volatilityPercentile10Y,
    pivots,
    srClusters,
    swingStructure,
    patterns,
    regime,
    tradable,
  };
}

/**
 * Builds the compact JSON snapshot sent to specialist agents.
 */
export function buildFeatureSnapshot(
  symbol: string,
  timeframe: Timeframe,
  candles: Candle[]
): FeatureSnapshot {
  const currentPrice = candles[candles.length - 1].close;
  const indicators = computeTechnicalIndicators(candles, timeframe);

  return {
    symbol,
    timeframe,
    timestamp: candles[candles.length - 1].timestamp,
    currentPrice,
    indicators,
  };
}

/**
 * Builds multi-timeframe snapshot across all 5 required timeframes: M15, H1, H4, D1, W1.
 */
export function buildMultiTimeframeSnapshot(
  symbol: string,
  candleData: Record<Timeframe, Candle[]>
): MultiTimeframeSnapshot {
  const currentPrice = candleData.H1[candleData.H1.length - 1].close;
  const timeframes = {
    M15: computeTechnicalIndicators(candleData.M15, 'M15'),
    H1: computeTechnicalIndicators(candleData.H1, 'H1'),
    H4: computeTechnicalIndicators(candleData.H4, 'H4'),
    D1: computeTechnicalIndicators(candleData.D1, 'D1'),
    W1: computeTechnicalIndicators(candleData.W1, 'W1'),
  };

  return {
    symbol,
    timestamp: candleData.H1[candleData.H1.length - 1].timestamp,
    currentPrice,
    timeframes,
  };
}
