/**
 * Unit Test for Phase 2: Agent 1 (Trend & Momentum) end-to-end.
 * Run via: npx tsx src/agents/testTrendAgent.ts
 */

import { generateRealisticCandles } from '../data/marketDataService';
import { buildFeatureSnapshot } from '../quant/snapshot';
import { queryHistoricalAnalogs } from '../analogs/analogEngine';
import { executeTrendAgent } from './trendAgent';
import { validateAgentOutput } from './schemas';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

export async function runTrendAgentTest() {
  console.log('\n=============================================');
  console.log('STARTING PHASE 2: TREND AGENT END-TO-END TEST');
  console.log('=============================================\n');

  const candles = generateRealisticCandles('EURUSD', 'H1', 120);
  const snapshot = buildFeatureSnapshot('EURUSD', 'H1', candles);
  const analogs = queryHistoricalAnalogs(snapshot);

  console.log(`Snapshot compiled for ${snapshot.symbol} on ${snapshot.timeframe}.`);
  console.log(`Regime: ${snapshot.indicators.regime}, ADX: ${snapshot.indicators.adx14}, EMA Stack: ${snapshot.indicators.emaStack}`);
  console.log(`Analog Sample Size: ${analogs.sampleSize}, IsSufficient: ${analogs.isSufficientEvidence}`);

  const agentOutput = await executeTrendAgent({ snapshot, analogs });

  console.log('\nReceived Agent Output:');
  console.log(JSON.stringify(agentOutput, null, 2));

  // 1. Schema Validation
  const validation = validateAgentOutput(agentOutput);
  assert(validation.valid, `Output satisfies BaseAgentOutput schema: ${validation.errors.join(', ')}`);

  // 2. Discipline checks
  assert(['BUY', 'SELL', 'NEUTRAL'].includes(agentOutput.direction), `Valid direction: ${agentOutput.direction}`);
  assert(agentOutput.confidence >= 0 && agentOutput.confidence <= 100, `Confidence is calibrated (0-100): ${agentOutput.confidence}`);
  assert(agentOutput.reasoning.length > 0 && agentOutput.reasoning.length <= 600, 'Reasoning length conforms to word count constraints');

  // 3. Evidence citation check
  assert(agentOutput.evidence.length >= 1, 'Agent cited evidence');
  for (const ev of agentOutput.evidence) {
    assert(['analog', 'kb_doc', 'snapshot'].includes(ev.source), `Valid evidence source: ${ev.source}`);
    if (ev.source === 'analog' && analogs.sampleSize >= 30) {
      assert(ev.sample_size !== null && ev.sample_size >= 30, `Sample size cited matches N >= 30: ${ev.sample_size}`);
    }
  }

  // 4. Invalidation Level
  assert(typeof agentOutput.invalidation_level === 'number' && agentOutput.invalidation_level > 0, `Invalidation level provided: ${agentOutput.invalidation_level}`);

  console.log('\n=============================================');
  console.log('PHASE 2: TREND AGENT TEST COMPLETED SUCCESSFULLY');
  console.log('=============================================\n');
  return true;
}

if (import.meta.url.endsWith('testTrendAgent.ts') || process.argv[1]?.includes('testTrendAgent')) {
  runTrendAgentTest().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
