import { Candle, PivotLevels, SRCluster, SwingStructure, Timeframe } from '../types/market';

/**
 * Calculates Standard & Fibonacci Pivot Points from the previous completed bar or period.
 */
export function calculatePivots(high: number, low: number, close: number): PivotLevels {
  const pp = (high + low + close) / 3;
  const range = high - low;

  const r1 = 2 * pp - low;
  const s1 = 2 * pp - high;
  const r2 = pp + range;
  const s2 = pp - range;
  const r3 = high + 2 * (pp - low);
  const s3 = low - 2 * (high - pp);

  return { pp, r1, r2, r3, s1, s2, s3 };
}

/**
 * Detects swing highs and swing lows using fractal window (e.g., 2 bars left, 2 bars right).
 */
export function detectSwings(candles: Candle[], window = 2) {
  const swingHighs: { index: number; price: number; timestamp: number }[] = [];
  const swingLows: { index: number; price: number; timestamp: number }[] = [];

  for (let i = window; i < candles.length - window; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let offset = -window; offset <= window; offset++) {
      if (offset === 0) continue;
      if (candles[i + offset].high >= currentHigh) isHigh = false;
      if (candles[i + offset].low <= currentLow) isLow = false;
    }

    if (isHigh) {
      swingHighs.push({ index: i, price: currentHigh, timestamp: candles[i].timestamp });
    }
    if (isLow) {
      swingLows.push({ index: i, price: currentLow, timestamp: candles[i].timestamp });
    }
  }

  return { swingHighs, swingLows };
}

/**
 * Evaluates Break of Structure (BOS), Change of Character (CHoCH), and Liquidity Sweeps.
 */
export function evaluateMarketStructure(candles: Candle[], timeframe: Timeframe): SwingStructure {
  const len = candles.length;
  if (len < 10) {
    return {
      lastSwingHigh: candles[len - 1]?.high ?? 0,
      lastSwingLow: candles[len - 1]?.low ?? 0,
      structure: 'TRANSITIONING',
      bos: false,
      choch: false,
      liquiditySweep: null,
    };
  }

  const { swingHighs, swingLows } = detectSwings(candles, 2);
  const lastHigh = swingHighs[swingHighs.length - 1];
  const prevHigh = swingHighs[swingHighs.length - 2];
  const lastLow = swingLows[swingLows.length - 1];
  const prevLow = swingLows[swingLows.length - 2];

  const currentPrice = candles[len - 1].close;
  const currentHigh = candles[len - 1].high;
  const currentLow = candles[len - 1].low;

  let structure: 'BULLISH' | 'BEARISH' | 'TRANSITIONING' = 'TRANSITIONING';
  let bos = false;
  let choch = false;
  let liquiditySweep: 'BUY_SIDE' | 'SELL_SIDE' | null = null;

  if (lastHigh && prevHigh && lastLow && prevLow) {
    const higherHighs = lastHigh.price > prevHigh.price;
    const higherLows = lastLow.price > prevLow.price;
    const lowerHighs = lastHigh.price < prevHigh.price;
    const lowerLows = lastLow.price < prevLow.price;

    if (higherHighs && higherLows) {
      structure = 'BULLISH';
    } else if (lowerHighs && lowerLows) {
      structure = 'BEARISH';
    } else {
      structure = 'TRANSITIONING';
    }

    // Break of Structure (BOS): price closes beyond the most recent swing in the trend direction
    if (structure === 'BULLISH' && currentPrice > lastHigh.price) {
      bos = true;
    } else if (structure === 'BEARISH' && currentPrice < lastLow.price) {
      bos = true;
    }

    // Change of Character (CHoCH): price closes beyond the counter swing in a trend
    if (structure === 'BULLISH' && currentPrice < lastLow.price) {
      choch = true;
    } else if (structure === 'BEARISH' && currentPrice > lastHigh.price) {
      choch = true;
    }

    // Liquidity Sweep (Stop Run): wick breaks swing point but close remains inside
    if (currentHigh > lastHigh.price && currentPrice < lastHigh.price) {
      liquiditySweep = 'BUY_SIDE';
    } else if (currentLow < lastLow.price && currentPrice > lastLow.price) {
      liquiditySweep = 'SELL_SIDE';
    }
  }

  return {
    lastSwingHigh: lastHigh?.price ?? candles[len - 1].high,
    lastSwingLow: lastLow?.price ?? candles[len - 1].low,
    structure,
    bos,
    choch,
    liquiditySweep,
  };
}

/**
 * Clusters swing levels into strong horizontal Support & Resistance zones with touch counts.
 */
export function clusterSRLevels(
  candles: Candle[],
  timeframe: Timeframe,
  atr: number,
  toleranceAtrMultiple = 0.5
): SRCluster[] {
  const { swingHighs, swingLows } = detectSwings(candles, 2);
  const clusters: SRCluster[] = [];
  const tolerance = (atr || 0.001) * toleranceAtrMultiple;
  const currentBar = candles.length - 1;

  // Cluster swing highs (Resistance)
  for (const sh of swingHighs) {
    const existing = clusters.find(
      (c) => c.type === 'resistance' && Math.abs(c.price - sh.price) <= tolerance
    );
    if (existing) {
      existing.touches += 1;
      existing.price = (existing.price * (existing.touches - 1) + sh.price) / existing.touches;
      existing.recencyBars = Math.min(existing.recencyBars, currentBar - sh.index);
    } else {
      clusters.push({
        price: sh.price,
        type: 'resistance',
        touches: 1,
        timeframe,
        recencyBars: currentBar - sh.index,
      });
    }
  }

  // Cluster swing lows (Support)
  for (const sl of swingLows) {
    const existing = clusters.find(
      (c) => c.type === 'support' && Math.abs(c.price - sl.price) <= tolerance
    );
    if (existing) {
      existing.touches += 1;
      existing.price = (existing.price * (existing.touches - 1) + sl.price) / existing.touches;
      existing.recencyBars = Math.min(existing.recencyBars, currentBar - sl.index);
    } else {
      clusters.push({
        price: sl.price,
        type: 'support',
        touches: 1,
        timeframe,
        recencyBars: currentBar - sl.index,
      });
    }
  }

  // Sort by touch count descending (strongest first)
  return clusters.sort((a, b) => b.touches - a.touches);
}
