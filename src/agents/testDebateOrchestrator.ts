/**
 * Unit Test for Phase 3: All 10 Specialist Agents, Round 2 Cross-Exam, and Chief Arbiter.
 * Run via: npx tsx src/agents/testDebateOrchestrator.ts
 */

import { generateRealisticCandles } from '../data/marketDataService';
import { buildFeatureSnapshot } from '../quant/snapshot';
import { queryHistoricalAnalogs } from '../analogs/analogEngine';
import { getCOTData } from '../analogs/cotEngine';
import { runFullDebate } from './debateOrchestrator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

export async function runDebateTest() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 3: 10-AGENT DEBATE & ARBITER TEST SUITE');
  console.log('======================================================\n');

  const symbol = 'XAUUSD'; // Gold
  const candles = generateRealisticCandles(symbol, 'H1', 120);
  const snapshot = buildFeatureSnapshot(symbol, 'H1', candles);
  const analogs = queryHistoricalAnalogs(snapshot);
  const cot = getCOTData(symbol);

  console.log(`Instrument: ${symbol} (${candles.length} bars)`);
  console.log(`Regime: ${snapshot.indicators.regime}, Tradable: ${snapshot.indicators.tradable}`);
  console.log(`COT Percentile: ${cot.percentile30Y}th, Analog Sample Size: ${analogs.sampleSize}`);

  const debate = await runFullDebate({
    snapshot,
    analogs,
    cot,
  });

  // 1. Verify Round 1: exactly 10 specialist agents responded
  const r1Keys = Object.keys(debate.round1);
  assert(r1Keys.length === 10, `Round 1 contains all 10 specialists, got ${r1Keys.length}`);
  assert(r1Keys.includes('Trend & Momentum'), 'Trend & Momentum present in Round 1');
  assert(r1Keys.includes('Mean Reversion'), 'Mean Reversion present in Round 1');
  assert(r1Keys.includes('Price Action & S/R'), 'Price Action present in Round 1');
  assert(r1Keys.includes('Volatility & Regime'), 'Volatility & Regime present in Round 1');
  assert(r1Keys.includes('Market Structure & Volume'), 'Market Structure present in Round 1');
  assert(r1Keys.includes('Macro & Fundamental'), 'Macro & Fundamental present in Round 1');
  assert(r1Keys.includes('News & Sentiment'), 'News & Sentiment present in Round 1');
  assert(r1Keys.includes('Intermarket'), 'Intermarket present in Round 1');
  assert(r1Keys.includes('Positioning & Seasonality'), 'Positioning present in Round 1');
  assert(r1Keys.includes('Risk Manager'), 'Risk Manager present in Round 1');

  // 2. Verify Round 2 Cross-Examination Matrix
  const r2Keys = Object.keys(debate.round2);
  assert(r2Keys.length === 10, `Round 2 cross-examination has 10 responses, got ${r2Keys.length}`);
  for (const name of r2Keys) {
    const r2Agent = debate.round2[name as keyof typeof debate.round2];
    assert(r2Agent.disagrees_with !== undefined, `${name} has disagrees_with callout`);
    assert(r2Agent.convinced_by !== undefined, `${name} has convinced_by callout`);
    assert(typeof r2Agent.revised === 'boolean', `${name} recorded revised flag`);
  }

  // 3. Verify Chief Arbiter Output
  const arb = debate.arbiter;
  assert(['BUY', 'SELL', 'NO_TRADE'].includes(arb.final_recommendation), `Arbiter produced valid recommendation: ${arb.final_recommendation}`);
  assert(arb.confidence >= 0 && arb.confidence <= 100, `Arbiter confidence calibrated: ${arb.confidence}`);
  assert(['strong', 'moderate', 'split'].includes(arb.consensus_level), `Consensus level valid: ${arb.consensus_level}`);
  assert(['aligned', 'partial', 'conflicting'].includes(arb.timeframe_alignment), `Timeframe alignment valid: ${arb.timeframe_alignment}`);
  assert(['A', 'B', 'C'].includes(arb.evidence_quality.badge), `Evidence quality badge valid: ${arb.evidence_quality.badge}`);

  // 4. Multi-Timeframe Output check
  for (const tf of ['W1', 'D1', 'H4', 'H1', 'M15'] as const) {
    assert(arb.per_timeframe[tf] !== undefined, `Per-timeframe bias computed for ${tf}`);
    assert(['BUY', 'SELL', 'NEUTRAL', 'NO_TRADE'].includes(arb.per_timeframe[tf].bias), `Bias valid for ${tf}: ${arb.per_timeframe[tf].bias}`);
  }

  // 5. Risk Manager Veto Enforcement
  const riskMgr = debate.round1['Risk Manager'] as any;
  if (riskMgr.decision === 'VETO') {
    assert(arb.final_recommendation === 'NO_TRADE', 'Risk Manager VETO hard gate strictly enforced: Arbiter must output NO_TRADE');
  } else {
    assert(arb.risk_reward >= 1.5 || arb.final_recommendation === 'NO_TRADE', `Risk:Reward satisfies minimum 1.5 requirement: ${arb.risk_reward}`);
  }

  console.log('\nArbiter Synthesis:');
  console.log(`Final Recommendation: ${arb.final_recommendation} (${arb.confidence}% confidence, Consensus: ${arb.consensus_level})`);
  console.log(`Evidence Badge: ${arb.evidence_quality.badge} (Sample size: ${arb.evidence_quality.analog_sample_size})`);
  console.log(`Rationale: ${arb.rationale}`);

  console.log('\n======================================================');
  console.log('PHASE 3: DEBATE ORCHESTRATOR TEST PASSED (ALL 10 AGENTS)');
  console.log('======================================================\n');
  return true;
}

if (import.meta.url.endsWith('testDebateOrchestrator.ts') || process.argv[1]?.includes('testDebateOrchestrator')) {
  runDebateTest().catch((err) => {
    console.error('Debate test failed:', err);
    process.exit(1);
  });
}
