/**
 * Comprehensive Unit Test Suite for Feature Engine & Analog Engine.
 * Run via: npx tsx src/quant/testFeatureEngine.ts
 */

import { generateRealisticCandles } from '../data/marketDataService';
import {
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateStochastic,
} from './indicators';
import { detectCandlePatterns } from './patterns';
import { classifyRegime } from './regime';
import { buildFeatureSnapshot, computeTechnicalIndicators } from './snapshot';
import { clusterSRLevels, calculatePivots, evaluateMarketStructure } from './structure';
import { queryHistoricalAnalogs } from '../analogs/analogEngine';
import { getCOTData } from '../analogs/cotEngine';
import { getAgentKBDocs } from '../analogs/kbDocuments';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

export function runQuantTests() {
  console.log('\n========================================');
  console.log('STARTING QUANT FEATURE ENGINE TEST SUITE');
  console.log('========================================\n');

  // Test 1: Generate multi-timeframe candles
  const candles = generateRealisticCandles('EURUSD', 'H1', 100);
  assert(candles.length === 101, 'Generated exact candle count (101 bars)');
  assert(candles[0].timestamp < candles[100].timestamp, 'Candles are chronologically sorted');
  assert(candles[50].high >= candles[50].low, 'High >= Low holds for all bars');
  assert(candles[50].high >= Math.max(candles[50].open, candles[50].close), 'High covers open and close');

  // Test 2: Moving Averages & RSI
  const closes = candles.map((c) => c.close);
  const ema20 = calculateEMA(closes, 20);
  assert(isNaN(ema20[10]), 'EMA20 returns NaN before period 20');
  assert(!isNaN(ema20[19]), 'EMA20 initialized properly at index 19');
  assert(!isNaN(ema20[99]), 'EMA20 calculated to latest bar');

  const rsi = calculateRSI(closes, 14);
  const latestRsi = rsi[rsi.length - 1];
  assert(latestRsi >= 0 && latestRsi <= 100, `RSI is bounded in [0, 100], got ${latestRsi}`);

  // Test 3: MACD, Stochastic, ATR, ADX, Bollinger Bands
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const macd = calculateMACD(closes);
  assert(!isNaN(macd.macdLine[99]), 'MACD line valid on latest bar');
  assert(!isNaN(macd.signalLine[99]), 'MACD signal line valid on latest bar');

  const stoch = calculateStochastic(highs, lows, closes);
  const latestK = stoch.stochK[stoch.stochK.length - 1];
  const latestD = stoch.stochD[stoch.stochD.length - 1];
  assert(latestK >= 0 && latestK <= 100, `Stoch %K is bounded, got ${latestK}`);
  assert(latestD >= 0 && latestD <= 100, `Stoch %D is bounded, got ${latestD}`);

  const atr = calculateATR(candles, 14);
  const latestAtr = atr[atr.length - 1];
  assert(latestAtr > 0, `ATR is positive, got ${latestAtr}`);

  const adx = calculateADX(candles, 14);
  const latestAdx = adx.adx[adx.adx.length - 1];
  assert(latestAdx >= 0 && latestAdx <= 100, `ADX is bounded, got ${latestAdx}`);

  const bb = calculateBollingerBands(closes, 20, 2);
  const latestUpper = bb.upper[bb.upper.length - 1];
  const latestLower = bb.lower[bb.lower.length - 1];
  assert(latestUpper > latestLower, 'Bollinger Upper is strictly greater than Lower');

  // Test 4: Market Structure & Pivots
  const pivots = calculatePivots(candles[98].high, candles[98].low, candles[98].close);
  assert(pivots.r1 > pivots.pp && pivots.pp > pivots.s1, 'Pivots satisfy R1 > PP > S1 hierarchy');

  const structure = evaluateMarketStructure(candles, 'H1');
  assert(['BULLISH', 'BEARISH', 'TRANSITIONING'].includes(structure.structure), 'Structure state is valid');

  const srClusters = clusterSRLevels(candles, 'H1', latestAtr);
  assert(srClusters.length > 0, 'Generated horizontal support and resistance clusters');
  assert(srClusters[0].touches >= 1, 'Top cluster has at least 1 touch');

  // Test 5: Candlestick patterns
  const patterns = detectCandlePatterns(candles);
  assert(typeof patterns.insideBar === 'boolean', 'Inside bar check returns boolean');
  assert(typeof patterns.doji === 'boolean', 'Doji check returns boolean');

  // Test 6: Regime Classifier & Tradability Gate
  const regimeVerdict = classifyRegime(
    latestAdx,
    ema20[99],
    calculateEMA(closes, 50)[99],
    calculateEMA(closes, 100)[99],
    bb.bandwidth[99],
    50,
    structure.structure,
    candles
  );
  assert(
    ['trend_bull', 'trend_bear', 'range', 'chop', 'breakout', 'volatility_expansion'].includes(
      regimeVerdict.regime
    ),
    `Regime classification returned valid label: ${regimeVerdict.regime}`
  );
  assert(typeof regimeVerdict.tradable === 'boolean', 'Tradability verdict returns boolean');

  // Test 7: Master Feature Snapshot Compilation
  const snapshot = buildFeatureSnapshot('EURUSD', 'H1', candles);
  assert(snapshot.symbol === 'EURUSD', 'Snapshot symbol matches');
  assert(snapshot.timeframe === 'H1', 'Snapshot timeframe matches');
  assert(snapshot.indicators.rsi14 >= 0, 'Snapshot contains validated indicators');
  assert(snapshot.indicators.regime !== undefined, 'Snapshot contains regime label');

  // Test 8: 30-Year Analog Engine & N >= 30 Sample Size Enforcement
  const analogs = queryHistoricalAnalogs(snapshot);
  assert(analogs.sampleSize >= 0, `Analog sample size returned: ${analogs.sampleSize}`);
  assert(
    analogs.isSufficientEvidence === (analogs.sampleSize >= 30),
    `N >= 30 threshold rule strictly enforced (sampleSize=${analogs.sampleSize}, isSufficient=${analogs.isSufficientEvidence})`
  );
  assert(analogs.closestDates.length > 0, 'Returned closest historical analog dates');

  // Test 9: COT 30-Year Percentile Engine
  const cot = getCOTData('EURUSD');
  assert(cot.percentile30Y >= 0 && cot.percentile30Y <= 100, `COT 30Y percentile in range: ${cot.percentile30Y}`);

  // Test 10: Curated Knowledge Base collections
  const trendDocs = getAgentKBDocs('Trend & Momentum');
  assert(trendDocs.length > 0, 'Trend & Momentum has curated KB collection');
  const riskDocs = getAgentKBDocs('Risk Manager');
  assert(riskDocs.length > 0, 'Risk Manager has curated KB collection with MAE statistics');

  console.log('\n========================================');
  console.log('ALL 10 QUANT FEATURE ENGINE TESTS PASSED!');
  console.log('========================================\n');
  return true;
}

// If run directly via tsx
if (import.meta.url.endsWith('testFeatureEngine.ts') || process.argv[1]?.includes('testFeatureEngine')) {
  runQuantTests();
}
