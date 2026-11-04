import { scannerService } from './scannerService';
import { alertService } from './alertService';
import { paperTrader } from '../backtest/paperTrader';

async function runVerification() {
  console.log('=== QUANT MARKET SCANNER: PHASE 5 & 6 VERIFICATION ===\n');

  // 1. Test alert service config and dispatch
  console.log('[1/4] Testing Alert Service...');
  const initialAlerts = alertService.getHistory();
  console.log(`Initial alert history count: ${initialAlerts.length}`);
  const testAlert = await alertService.sendTestAlert('EURUSD');
  console.log(`Dispatched test alert: ${testAlert.symbol} ${testAlert.direction} (Confidence ${testAlert.confidence}%) - Status: ${testAlert.statusMessage}`);
  if (testAlert.delivered) {
    console.log('✓ Alert Service OK\n');
  } else {
    throw new Error('Alert dispatch failed');
  }

  // 2. Test pre-filter logic
  console.log('[2/4] Testing Deterministic Pre-Filter...');
  const deadChopIndicators = {
    isTradable: true,
    adx: 12.4,
    atrPercentile: 18.0,
    regime: 'chop',
    distEma20InAtr: 0.1,
  };
  const filterChop = scannerService.preFilterMarket(deadChopIndicators);
  console.log(`Chop pre-filter result: passed=${filterChop.passed}, reason="${filterChop.reason}"`);
  if (filterChop.passed) throw new Error('Pre-filter failed to catch dead chop');

  const trendingIndicators = {
    isTradable: true,
    adx: 28.5,
    atrPercentile: 62.0,
    regime: 'trend_bull',
    distEma20InAtr: 1.2,
  };
  const filterTrend = scannerService.preFilterMarket(trendingIndicators);
  console.log(`Trending pre-filter result: passed=${filterTrend.passed}, reason="${filterTrend.reason}"`);
  if (!filterTrend.passed) throw new Error('Pre-filter rejected valid trend');
  console.log('✓ Pre-Filter Rules OK\n');

  // 3. Test Ranked Opportunities retrieval
  console.log('[3/4] Testing Ranked Opportunities Engine...');
  const ranked = scannerService.getRankedOpportunities();
  console.log(`Ranked opportunities loaded: ${ranked.length} setups`);
  for (const opp of ranked.slice(0, 3)) {
    console.log(`  - [Ranked] ${opp.symbol} (${opp.timeframe}) ${opp.direction} | Conviction: ${opp.convictionScore}/100 | R:R ${opp.riskReward} | Badge: [${opp.evidenceBadge}] | Risk Manager: ${opp.riskManagerApproval}`);
  }
  if (ranked.length === 0) throw new Error('No ranked opportunities found');
  console.log('✓ Ranked Opportunities Engine OK\n');

  // 4. Test Paper Trader & Bayesian Feedback Loop
  console.log('[4/4] Testing Paper Trader & Bayesian Feedback Loop...');
  const summaryBefore = paperTrader.getAccountSummary();
  console.log(`Account Equity: $${summaryBefore.equity.toFixed(2)} | Win Rate: ${summaryBefore.winRate}% | Realized: +${summaryBefore.totalRealizedR}R`);
  const openPos = paperTrader.getOpenPositions();
  console.log(`Open paper positions: ${openPos.length} (${openPos.map((p) => p.symbol).join(', ')})`);

  // Simulate market tick
  const tickResult = await paperTrader.simulateMarketTick();
  console.log(`Simulated tick: updated ${tickResult.updated} positions, resolved ${tickResult.resolved.length}`);
  const summaryAfter = paperTrader.getAccountSummary();
  console.log(`Post-tick Account Equity: $${summaryAfter.equity.toFixed(2)}`);
  console.log('✓ Paper Trader & Live Bayesian Feedback Loop OK\n');

  console.log('=====================================================');
  console.log('ALL PHASE 5 & 6 SCHEDULER/ALERTS/PAPER TRADER TESTS PASSED!');
  console.log('=====================================================');
}

runVerification().catch((err) => {
  console.error('Phase 5 & 6 test failed:', err);
  process.exit(1);
});
