import { Candle, RegimeLabel } from '../types/market';

/**
 * Classifies market regime and tradability based on 6 quantitative factors:
 * 1. ADX strength (> 25 trending, < 20 ranging/choppy)
 * 2. EMA stack & slope (20 vs 50 vs 200)
 * 3. Bollinger Bandwidth (squeeze vs expansion)
 * 4. ATR percentile (volatility state)
 * 5. Swing structure direction (higher highs/lows vs lower highs/lows vs overlapping)
 * 6. Candle range consistency
 */
export function classifyRegime(
  adx: number,
  ema20: number,
  ema50: number,
  ema200: number,
  bollingerBandwidth: number,
  atrPercentile: number,
  structure: 'BULLISH' | 'BEARISH' | 'TRANSITIONING',
  candles: Candle[]
): { regime: RegimeLabel; tradable: boolean; reason: string } {
  // Check for volatility squeeze / expansion
  const isSqueeze = bollingerBandwidth < 0.03;
  const isExpansion = bollingerBandwidth > 0.08 || atrPercentile > 90;

  // EMA alignment
  const emaBullish = ema20 > ema50 && ema50 > ema200;
  const emaBearish = ema20 < ema50 && ema50 < ema200;

  let regime: RegimeLabel = 'range';
  let tradable = true;
  let reason = '';

  // 1. Volatility Expansion / Breakout
  if (isExpansion && adx > 25) {
    if (structure === 'BULLISH' || emaBullish) {
      regime = 'trend_bull';
      reason = 'Strong bullish trend with volatility expansion';
    } else if (structure === 'BEARISH' || emaBearish) {
      regime = 'trend_bear';
      reason = 'Strong bearish trend with volatility expansion';
    } else {
      regime = 'volatility_expansion';
      reason = 'High volatility expansion without clean EMA alignment';
    }
  }
  // 2. Clear Trends
  else if (adx >= 25 && emaBullish && structure === 'BULLISH') {
    regime = 'trend_bull';
    reason = 'Confirmed bullish trend: ADX >= 25, stacked EMAs, higher swing structure';
  } else if (adx >= 25 && emaBearish && structure === 'BEARISH') {
    regime = 'trend_bear';
    reason = 'Confirmed bearish trend: ADX >= 25, stacked EMAs, lower swing structure';
  }
  // 3. Breakout from Squeeze
  else if (isSqueeze) {
    regime = 'range';
    reason = 'Bollinger band compression (volatility squeeze in range)';
  }
  // 4. Chop / Untradable conditions
  else if (adx < 18 && structure === 'TRANSITIONING') {
    regime = 'chop';
    tradable = false;
    reason = 'Chop: ADX < 18 with conflicting swing structure and flat EMAs';
  }
  // 5. Normal Range
  else {
    regime = 'range';
    reason = 'Range-bound: price oscillating between boundaries without trend momentum';
  }

  // Extreme low volatility gate
  if (atrPercentile < 5) {
    tradable = false;
    reason = 'Untradable: Volatility below 5th percentile (dead market liquidity)';
  }

  // Extreme chaotic volatility gate (e.g. flash shock)
  if (atrPercentile > 98) {
    tradable = false;
    reason = 'Untradable: Volatility above 98th percentile (extreme event risk/slippage)';
  }

  return { regime, tradable, reason };
}
