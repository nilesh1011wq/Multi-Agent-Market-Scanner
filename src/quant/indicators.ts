import { Candle } from '../types/market';

/**
 * Calculates Simple Moving Average (SMA).
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  if (data.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result.push(sum / period);

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result.push(sum / period);
  }

  // Prepend NaNs or align to length
  const padded = new Array(period - 1).fill(NaN).concat(result);
  return padded;
}

/**
 * Calculates Exponential Moving Average (EMA).
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return new Array(data.length).fill(NaN);

  const k = 2 / (period + 1);
  const result: number[] = new Array(data.length).fill(NaN);

  // Initialize with SMA
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += data[i];
  }
  let prevEma = initialSum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] - prevEma) * k + prevEma;
    result[i] = currentEma;
    prevEma = currentEma;
  }

  return result;
}

/**
 * Calculates Wilder's Relative Strength Index (RSI).
 */
export function calculateRSI(closes: number[], period = 14): number[] {
  if (closes.length <= period) return new Array(closes.length).fill(NaN);

  const result: number[] = new Array(closes.length).fill(NaN);
  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence).
 */
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = slowPeriod - 1; i < closes.length; i++) {
    macdLine[i] = fastEMA[i] - slowEMA[i];
  }

  // Filter out NaNs for signal calculation
  const validMacd: number[] = [];
  const validIndices: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (!isNaN(macdLine[i])) {
      validMacd.push(macdLine[i]);
      validIndices.push(i);
    }
  }

  const signalLineValid = calculateEMA(validMacd, signalPeriod);
  const signalLine: number[] = new Array(closes.length).fill(NaN);
  const histogram: number[] = new Array(closes.length).fill(NaN);

  for (let j = 0; j < validMacd.length; j++) {
    const originalIdx = validIndices[j];
    signalLine[originalIdx] = signalLineValid[j];
    if (!isNaN(signalLineValid[j])) {
      histogram[originalIdx] = macdLine[originalIdx] - signalLineValid[j];
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Calculates Stochastic Oscillator (%K and %D).
 */
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
  smooth = 3
) {
  const len = closes.length;
  const rawK: number[] = new Array(len).fill(NaN);

  for (let i = kPeriod - 1; i < len; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (highs[j] > highestHigh) highestHigh = highs[j];
      if (lows[j] < lowestLow) lowestLow = lows[j];
    }
    const range = highestHigh - lowestLow;
    rawK[i] = range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100;
  }

  // Smooth raw %K
  const smoothedK = calculateSMA(
    rawK.map((v) => (isNaN(v) ? 0 : v)),
    smooth
  );
  // Re-apply NaNs
  for (let i = 0; i < kPeriod + smooth - 2; i++) {
    smoothedK[i] = NaN;
  }

  // %D is SMA of smoothed %K
  const stochD = calculateSMA(
    smoothedK.map((v) => (isNaN(v) ? 0 : v)),
    dPeriod
  );
  for (let i = 0; i < kPeriod + smooth + dPeriod - 3; i++) {
    stochD[i] = NaN;
  }

  return { stochK: smoothedK, stochD };
}

/**
 * Calculates True Range (TR) and Average True Range (ATR).
 */
export function calculateATR(candles: Candle[], period = 14): number[] {
  const len = candles.length;
  if (len < 2) return new Array(len).fill(NaN);

  const tr: number[] = new Array(len).fill(0);
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < len; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    const prevClose = candles[i - 1].close;

    const hl = currentHigh - currentLow;
    const hc = Math.abs(currentHigh - prevClose);
    const lc = Math.abs(currentLow - prevClose);
    tr[i] = Math.max(hl, hc, lc);
  }

  const atr: number[] = new Array(len).fill(NaN);
  if (len < period) return atr;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  atr[period - 1] = prevAtr;

  for (let i = period; i < len; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    atr[i] = prevAtr;
  }

  return atr;
}

/**
 * Calculates Average Directional Index (ADX) and +DI / -DI.
 */
export function calculateADX(candles: Candle[], period = 14) {
  const len = candles.length;
  const adx: number[] = new Array(len).fill(NaN);
  if (len < period * 2) return { adx, plusDI: adx, minusDI: adx };

  const plusDM: number[] = new Array(len).fill(0);
  const minusDM: number[] = new Array(len).fill(0);
  const tr: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;

    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  // Smooth TR, +DM, -DM using Wilder's smoothing
  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;

  for (let i = 1; i <= period; i++) {
    smoothTR += tr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }

  const plusDI: number[] = new Array(len).fill(NaN);
  const minusDI: number[] = new Array(len).fill(NaN);
  const dx: number[] = new Array(len).fill(NaN);

  plusDI[period] = (smoothPlusDM / smoothTR) * 100;
  minusDI[period] = (smoothMinusDM / smoothTR) * 100;
  const diDiff = Math.abs(plusDI[period] - minusDI[period]);
  const diSum = plusDI[period] + minusDI[period];
  dx[period] = diSum === 0 ? 0 : (diDiff / diSum) * 100;

  for (let i = period + 1; i < len; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    plusDI[i] = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
    minusDI[i] = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;

    const diff = Math.abs(plusDI[i] - minusDI[i]);
    const sum = plusDI[i] + minusDI[i];
    dx[i] = sum === 0 ? 0 : (diff / sum) * 100;
  }

  // ADX is smoothed DX
  let dxSum = 0;
  for (let i = period; i < period * 2; i++) {
    dxSum += dx[i];
  }
  let prevADX = dxSum / period;
  adx[period * 2 - 1] = prevADX;

  for (let i = period * 2; i < len; i++) {
    prevADX = (prevADX * (period - 1) + dx[i]) / period;
    adx[i] = prevADX;
  }

  return { adx, plusDI, minusDI };
}

/**
 * Calculates Bollinger Bands (Upper, Middle, Lower, Bandwidth, %B).
 */
export function calculateBollingerBands(closes: number[], period = 20, multiplier = 2) {
  const sma = calculateSMA(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);
  const bandwidth: number[] = new Array(closes.length).fill(NaN);
  const percentB: number[] = new Array(closes.length).fill(NaN);

  for (let i = period - 1; i < closes.length; i++) {
    const mean = sma[i];
    let sumSquaredDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSquaredDiff += Math.pow(closes[j] - mean, 2);
    }
    const stdDev = Math.sqrt(sumSquaredDiff / period);
    upper[i] = mean + multiplier * stdDev;
    lower[i] = mean - multiplier * stdDev;
    bandwidth[i] = mean === 0 ? 0 : (upper[i] - lower[i]) / mean;

    const bandWidthPrice = upper[i] - lower[i];
    percentB[i] = bandWidthPrice === 0 ? 0.5 : (closes[i] - lower[i]) / bandWidthPrice;
  }

  return { upper, middle: sma, lower, bandwidth, percentB };
}
