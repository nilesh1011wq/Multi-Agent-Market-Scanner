import { Candle, CandlestickPatterns } from '../types/market';

/**
 * Recognizes core Japanese candlestick patterns on the latest closed candle.
 */
export function detectCandlePatterns(candles: Candle[]): CandlestickPatterns {
  const len = candles.length;
  if (len < 2) {
    return {
      bullishEngulfing: false,
      bearishEngulfing: false,
      pinBar: null,
      insideBar: false,
      doji: false,
    };
  }

  const curr = candles[len - 1];
  const prev = candles[len - 2];

  const currBody = Math.abs(curr.close - curr.open);
  const prevBody = Math.abs(prev.close - prev.open);
  const currRange = curr.high - curr.low;

  // Bullish Engulfing: prev is red, curr is green and completely engulfs prev body
  const bullishEngulfing =
    prev.close < prev.open &&
    curr.close > curr.open &&
    curr.open <= prev.close &&
    curr.close >= prev.open &&
    currBody > prevBody;

  // Bearish Engulfing: prev is green, curr is red and completely engulfs prev body
  const bearishEngulfing =
    prev.close > prev.open &&
    curr.close < curr.open &&
    curr.open >= prev.close &&
    curr.close <= prev.open &&
    currBody > prevBody;

  // Inside Bar: current high <= prev high and current low >= prev low
  const insideBar = curr.high <= prev.high && curr.low >= prev.low;

  // Doji: body is less than 10% of total range
  const doji = currRange > 0 && currBody / currRange <= 0.1;

  // Pin Bar (Hammer / Shooting Star): wick is at least 60% of total range, body is small
  let pinBar: 'BULLISH' | 'BEARISH' | null = null;
  if (currRange > 0 && currBody / currRange <= 0.35) {
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;

    if (lowerWick >= currRange * 0.6 && upperWick <= currRange * 0.2) {
      pinBar = 'BULLISH'; // Hammer / rejection of lower prices
    } else if (upperWick >= currRange * 0.6 && lowerWick <= currRange * 0.2) {
      pinBar = 'BEARISH'; // Shooting star / rejection of higher prices
    }
  }

  return {
    bullishEngulfing,
    bearishEngulfing,
    pinBar,
    insideBar,
    doji,
  };
}
