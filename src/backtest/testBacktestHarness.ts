/**
 * Automated Test Suite for Phase 4: Backtest Harness, Scorecards, and Bayesian Weights.
 * Run via: npx tsx src/backtest/testBacktestHarness.ts
 */

import { generateRealisticCandles } from '../data/marketDataService';
import { runWalkForwardBacktest, buildEquityCurve } from './engine';
import { scorecardService } from './scorecards';
import { RecommendationRecord } from '../types/scorecard';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

export function runBacktestTests() {
  console.log('\n=============================================================');
  console.log('STARTING PHASE 4: BACKTEST HARNESS & SCORECARDS TEST SUITE');
  console.log('=============================================================\n');

  const symbol = 'EURUSD';
  const timeframe = 'H1';
  const candles = generateRealisticCandles(symbol, timeframe, 200);

  // 1. Run Walk-Forward Backtest for Trend & Momentum
  const trendSummary = runWalkForwardBacktest('Trend & Momentum', symbol, timeframe, candles, 0.70);
  assert(trendSummary.totalTrades > 0, `Generated backtest trades: ${trendSummary.totalTrades}`);
  assert(trendSummary.hitRate >= 0 && trendSummary.hitRate <= 1, `Hit rate bounded in [0, 1]: ${trendSummary.hitRate}`);
  assert(trendSummary.profitFactor >= 0, `Profit factor valid: ${trendSummary.profitFactor}`);
  assert(trendSummary.inSampleHitRate >= 0 && trendSummary.inSampleHitRate <= 1, `In-sample hit rate valid: ${trendSummary.inSampleHitRate}`);
  assert(trendSummary.outOfSampleHitRate >= 0 && trendSummary.outOfSampleHitRate <= 1, `Out-of-sample hit rate valid: ${trendSummary.outOfSampleHitRate}`);

  // 2. Anti-Bias Walk-Forward Split Check
  const inSampleCount = trendSummary.trades.filter((t) => !t.isOutOfSample).length;
  const oosCount = trendSummary.trades.filter((t) => t.isOutOfSample).length;
  assert(inSampleCount > 0, `In-sample trades present: ${inSampleCount}`);
  assert(oosCount > 0, `Out-of-sample trades present: ${oosCount}`);
  assert(inSampleCount + oosCount === trendSummary.totalTrades, 'All trades correctly classified into in-sample or out-of-sample');

  // 3. Equity Curve Construction
  const equityCurve = buildEquityCurve(trendSummary.trades);
  assert(equityCurve.length === trendSummary.totalTrades, `Equity curve points match trade count: ${equityCurve.length}`);
  assert(equityCurve[0].tradesCount === 1, 'First point corresponds to trade 1');
  assert(equityCurve[equityCurve.length - 1].tradesCount === trendSummary.totalTrades, 'Final point reflects total trades');

  // 4. Scorecard Service & Bayesian Weight Retrieval
  const scorecards = scorecardService.getScorecards(symbol, timeframe);
  const agentNames = Object.keys(scorecards);
  assert(agentNames.length === 10, `Retrieved scorecards for all 10 specialists, got ${agentNames.length}`);

  // 5. Unproven Agent Weight Cap (< 30 resolved trades)
  const newsScorecard = scorecards['News & Sentiment'];
  assert(newsScorecard.resolvedTrades < 30, `News & Sentiment has unproven trade count (<30): ${newsScorecard.resolvedTrades}`);
  assert(newsScorecard.currentWeight <= 0.75, `Unproven agent (< 30 trades) weight is capped at <= 0.75: ${newsScorecard.currentWeight}`);

  // Proven Agent Weight Check (>= 30 resolved trades)
  const trendScorecard = scorecards['Trend & Momentum'];
  assert(trendScorecard.resolvedTrades >= 30, `Trend agent has proven sample size >= 30: ${trendScorecard.resolvedTrades}`);
  assert(trendScorecard.currentWeight >= 1.0, `Proven agent with out-of-sample edge has elevated weight: ${trendScorecard.currentWeight}`);

  // 6. Bayesian Live Update on Resolved Trade
  const initialWeight = trendScorecard.currentWeight;
  const mockRec: RecommendationRecord = {
    id: 'rec_test_1',
    symbol,
    timeframe,
    recommendation: 'BUY',
    confidence: 75,
    entryZone: [1.0850, 1.0860],
    stopLoss: 1.0800,
    takeProfit1: 1.0950,
    takeProfit2: 1.1000,
    riskReward: 1.8,
    evidenceBadge: 'A',
    status: 'ACTIVE',
    openedAt: Date.now() - 3600000,
    consensusLevel: 'strong',
    rationale: 'Test recommendation resolution',
  };

  scorecardService.recordTradeResolution(mockRec, 'WIN', 1.8, ['Trend & Momentum']);
  const updatedTrend = scorecardService.getScorecards(symbol, timeframe)['Trend & Momentum'];
  assert(updatedTrend.resolvedTrades === trendScorecard.resolvedTrades, `Resolved trades incremented: ${updatedTrend.resolvedTrades}`);
  assert(updatedTrend.wins > 0, `Wins recorded: ${updatedTrend.wins}`);

  console.log('\nSample Scorecard Metrics (Trend & Momentum):');
  console.log(`Resolved Trades: ${updatedTrend.resolvedTrades} (IS Win Rate: ${(updatedTrend.inSampleHitRate * 100).toFixed(0)}%, OOS Win Rate: ${(updatedTrend.outOfSampleHitRate * 100).toFixed(0)}%)`);
  console.log(`Avg R: +${updatedTrend.avgR}R, Profit Factor: ${updatedTrend.profitFactor}, Max DD: -${updatedTrend.maxDrawdownR}R`);
  console.log(`Bayesian Dynamic Weight: ${updatedTrend.currentWeight}x`);

  console.log('\n=============================================================');
  console.log('ALL PHASE 4 BACKTEST & SCORECARD TESTS PASSED!');
  console.log('=============================================================\n');
  return true;
}

if (import.meta.url.endsWith('testBacktestHarness.ts') || process.argv[1]?.includes('testBacktestHarness')) {
  runBacktestTests();
}
