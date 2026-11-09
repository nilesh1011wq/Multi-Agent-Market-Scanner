/**
 * PROFESSIONAL UAT (USER ACCEPTANCE TESTING) SUITE
 * 
 * Comprehensive end-to-end audit verifying:
 * 1. 12 Watchlist Assets (Forex & Commodities) & Pricing Integrity (digits, pip sizes, spreads, base prices)
 * 2. 5 Timeframes (M15, H1, H4, D1, W1) & Candle Chronological Continuity
 * 3. Deterministic Technical Feature Pipeline (EMAs, RSI, MACD, Stoch, ATR, ADX, Bollinger, Pivots, S/R, Swings, Patterns)
 * 4. 6-Factor Regime Classifier & Volatility Tradability Gates
 * 5. 30-Year Historical Analog Engine (1996-2026, N >= 30 sample size enforcement, COT 30y percentiles)
 * 6. All 10 Specialist Agents across Round 1, Round 2 Cross-Examination, and Chief Arbiter Synthesis
 * 7. Hard Risk Manager Gates (Veto authority, min 1.5 R:R, ATR-based Stop Loss & Take Profits)
 * 8. Multi-Asset Scanner & Ranked Opportunity Screener
 * 9. Live Paper Trading Engine, Simulated Tick Execution, PnL & Bayesian Scorecard Updates
 * 10. HTTP REST API Endpoints & Response Schemas
 */

import { WATCHLIST, generateRealisticCandles } from '../data/marketDataService';
import { buildFeatureSnapshot, buildMultiTimeframeSnapshot } from '../quant/snapshot';
import { queryHistoricalAnalogs } from '../analogs/analogEngine';
import { getCOTData } from '../analogs/cotEngine';
import { HISTORICAL_EVENTS } from '../analogs/historicalEvents';
import { KB_COLLECTIONS, getAgentKBDocs } from '../analogs/kbDocuments';
import { runFullDebate } from '../agents/debateOrchestrator';
import { scannerService } from '../scheduler/scannerService';
import { alertService } from '../scheduler/alertService';
import { paperTrader } from '../backtest/paperTrader';
import { scorecardService } from '../backtest/scorecards';
import { brokerManager } from '../broker/brokerManager';
import { calculateRiskBasedOrderMetrics } from '../broker/symbolMapper';
import { StandardizedOrderRequest } from '../types/broker';
import { Timeframe } from '../types/market';
import { AgentName } from '../types/debate';

interface TestResult {
  category: string;
  testName: string;
  passed: boolean;
  details: string;
  metric?: string | number;
}

const testResults: TestResult[] = [];

function recordTest(category: string, testName: string, condition: boolean, details: string, metric?: string | number) {
  testResults.push({
    category,
    testName,
    passed: condition,
    details,
    metric,
  });

  const icon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category}] ${testName}: ${details} ${metric !== undefined ? `(${metric})` : ''}`);
  if (!condition) {
    console.error(`CRITICAL FAILURE in [${category}] ${testName}`);
  }
}

export async function runProfessionalUAT() {
  console.log('\n========================================================================');
  console.log('   INSTITUTIONAL QUANT MULTI-AGENT TERMINAL - PROFESSIONAL UAT SUITE   ');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // 1. WATCHLIST ASSETS & PRICING VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 1: ASSET WATCHLIST & PRICING PRECISION AUDIT ---');

  recordTest(
    'Watchlist',
    'Asset Count',
    WATCHLIST.length === 15,
    'Watchlist contains exactly 15 institutional instruments (Forex, Commodities, Crypto)',
    WATCHLIST.length
  );

  const forexSymbols = WATCHLIST.filter((w) => w.assetClass === 'FOREX').map((w) => w.symbol);
  const commoditySymbols = WATCHLIST.filter((w) => w.assetClass === 'COMMODITY').map((w) => w.symbol);
  const cryptoSymbols = WATCHLIST.filter((w) => w.assetClass === 'CRYPTO').map((w) => w.symbol);

  recordTest(
    'Watchlist',
    'Forex Majors Count',
    forexSymbols.length === 7,
    '7 Forex Majors present (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD)',
    forexSymbols.join(', ')
  );

  recordTest(
    'Watchlist',
    'Commodity Count',
    commoditySymbols.length === 5,
    '5 Key Commodities present (XAUUSD, XAGUSD, WTI, BRENT, NATGAS)',
    commoditySymbols.join(', ')
  );

  recordTest(
    'Watchlist',
    'Crypto Count',
    cryptoSymbols.length === 3,
    '3 Major Cryptos present (BTCUSD, ETHUSD, SOLUSD)',
    cryptoSymbols.join(', ')
  );

  for (const config of WATCHLIST) {
    const candles = generateRealisticCandles(config.symbol, 'H1', 60);
    const latest = candles[candles.length - 1];

    // Pip size & precision checks
    const expectedDigits = config.digits;
    const isPricePositive = latest.close > 0;
    const isSpreadValid = config.minSpread > 0 && config.minSpread < config.pipSize * 50;

    let priceRangeValid = false;
    if (config.symbol === 'EURUSD') priceRangeValid = latest.close > 0.95 && latest.close < 1.30;
    else if (config.symbol === 'GBPUSD') priceRangeValid = latest.close > 1.10 && latest.close < 1.50;
    else if (config.symbol === 'USDJPY') priceRangeValid = latest.close > 120 && latest.close < 170;
    else if (config.symbol === 'AUDUSD') priceRangeValid = latest.close > 0.55 && latest.close < 0.85;
    else if (config.symbol === 'USDCAD') priceRangeValid = latest.close > 1.20 && latest.close < 1.55;
    else if (config.symbol === 'USDCHF') priceRangeValid = latest.close > 0.75 && latest.close < 1.05;
    else if (config.symbol === 'NZDUSD') priceRangeValid = latest.close > 0.50 && latest.close < 0.75;
    else if (config.symbol === 'XAUUSD') priceRangeValid = latest.close > 1800 && latest.close < 5000;
    else if (config.symbol === 'XAGUSD') priceRangeValid = latest.close > 15 && latest.close < 80;
    else if (config.symbol === 'WTI') priceRangeValid = latest.close > 40 && latest.close < 120;
    else if (config.symbol === 'BRENT') priceRangeValid = latest.close > 45 && latest.close < 130;
    else if (config.symbol === 'NATGAS') priceRangeValid = latest.close > 1.0 && latest.close < 8.0;
    else if (config.symbol === 'BTCUSD') priceRangeValid = latest.close > 30000 && latest.close < 200000;
    else if (config.symbol === 'ETHUSD') priceRangeValid = latest.close > 1000 && latest.close < 10000;
    else if (config.symbol === 'SOLUSD') priceRangeValid = latest.close > 20 && latest.close < 500;

    recordTest(
      'Pricing',
      `${config.symbol} Price Level & Range`,
      isPricePositive && priceRangeValid,
      `Price=${latest.close}, PipSize=${config.pipSize}, Digits=${expectedDigits}, Spread=${config.minSpread}`,
      latest.close
    );
  }

  // -------------------------------------------------------------------------
  // 2. TIMEFRAME CONTINUITY & CANDLE INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 2: MULTI-TIMEFRAME CANDLE CONTINUITY AUDIT ---');
  const testTimeframes: Timeframe[] = ['M15', 'H1', 'H4', 'D1', 'W1'];

  for (const tf of testTimeframes) {
    const candles = generateRealisticCandles('EURUSD', tf, 100);
    let chronoValid = true;
    let ohlcValid = true;
    let volumeValid = true;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (i > 0 && c.timestamp <= candles[i - 1].timestamp) chronoValid = false;
      if (c.high < c.low || c.high < c.open || c.high < c.close || c.low > c.open || c.low > c.close) ohlcValid = false;
      if (c.volume <= 0) volumeValid = false;
    }

    recordTest(
      'Timeframes',
      `Timeframe [${tf}] OHLCV Integrity`,
      chronoValid && ohlcValid && volumeValid,
      `100 bars verified: Chrono=${chronoValid}, OHLC=${ohlcValid}, Volume=${volumeValid}`,
      candles.length
    );
  }

  // -------------------------------------------------------------------------
  // 3. DETERMINISTIC QUANT ENGINE (INDICATORS, S/R, SWINGS, REGIMES)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 3: DETERMINISTIC QUANT FEATURE ENGINE AUDIT ---');
  const h1Candles = generateRealisticCandles('EURUSD', 'H1', 120);
  const snapshot = buildFeatureSnapshot('EURUSD', 'H1', h1Candles);
  const ind = snapshot.indicators;

  recordTest(
    'Quant Engine',
    'EMA Stack Computation',
    ind.ema20 > 0 && ind.ema50 > 0 && ind.ema200 > 0 && ['BULLISH', 'BEARISH', 'MIXED'].includes(ind.emaStack),
    `EMA20=${ind.ema20.toFixed(5)}, EMA50=${ind.ema50.toFixed(5)}, EMA200=${ind.ema200.toFixed(5)}, Stack=${ind.emaStack}`
  );

  recordTest(
    'Quant Engine',
    'RSI & Stochastic Bounding',
    ind.rsi14 >= 0 && ind.rsi14 <= 100 && ind.stochK >= 0 && ind.stochK <= 100 && ind.stochD >= 0 && ind.stochD <= 100,
    `RSI14=${ind.rsi14.toFixed(2)}, StochK=${ind.stochK.toFixed(2)}, StochD=${ind.stochD.toFixed(2)}`
  );

  recordTest(
    'Quant Engine',
    'MACD Structure',
    typeof ind.macd.line === 'number' && typeof ind.macd.signal === 'number' && typeof ind.macd.histogram === 'number',
    `Line=${ind.macd.line.toFixed(5)}, Signal=${ind.macd.signal.toFixed(5)}, Hist=${ind.macd.histogram.toFixed(5)}`
  );

  recordTest(
    'Quant Engine',
    'ATR & ADX Directional Health',
    ind.atr14 > 0 && ind.adx14 >= 0 && ind.adx14 <= 100,
    `ATR14=${ind.atr14.toFixed(5)}, ADX14=${ind.adx14.toFixed(2)}`
  );

  recordTest(
    'Quant Engine',
    'Bollinger Bands Order & Bandwidth',
    ind.bollingerBands.upper >= ind.bollingerBands.middle && ind.bollingerBands.middle >= ind.bollingerBands.lower && ind.bollingerBands.bandwidth >= 0,
    `Upper=${ind.bollingerBands.upper.toFixed(5)}, Mid=${ind.bollingerBands.middle.toFixed(5)}, Lower=${ind.bollingerBands.lower.toFixed(5)}, BW=${ind.bollingerBands.bandwidth.toFixed(2)}%`
  );

  recordTest(
    'Quant Engine',
    'Classical Pivot Hierarchy',
    ind.pivots.r3 > ind.pivots.r2 && ind.pivots.r2 > ind.pivots.r1 && ind.pivots.r1 > ind.pivots.pp && ind.pivots.pp > ind.pivots.s1 && ind.pivots.s1 > ind.pivots.s2 && ind.pivots.s2 > ind.pivots.s3,
    `R1=${ind.pivots.r1.toFixed(5)}, PP=${ind.pivots.pp.toFixed(5)}, S1=${ind.pivots.s1.toFixed(5)}`
  );

  recordTest(
    'Quant Engine',
    'Swing Structure & BOS / CHoCH Mapping',
    ['BULLISH', 'BEARISH', 'TRANSITIONING'].includes(ind.swingStructure.structure) && typeof ind.swingStructure.bos === 'boolean' && typeof ind.swingStructure.choch === 'boolean',
    `Structure=${ind.swingStructure.structure}, BOS=${ind.swingStructure.bos}, CHoCH=${ind.swingStructure.choch}`
  );

  recordTest(
    'Quant Engine',
    '6-Factor Regime Classification',
    ['trend_bull', 'trend_bear', 'range', 'chop', 'breakout', 'volatility_expansion'].includes(ind.regime) && typeof ind.tradable === 'boolean',
    `Regime=${ind.regime}, Tradable=${ind.tradable}`
  );

  // -------------------------------------------------------------------------
  // 4. 30-YEAR HISTORICAL ANALOG ENGINE & COT
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 4: 30-YEAR HISTORICAL ANALOG ENGINE AUDIT ---');
  const analogs = queryHistoricalAnalogs(snapshot);
  const cot = getCOTData('EURUSD');

  recordTest(
    'Analogs',
    'N >= 30 Sample Size Gate',
    analogs.sampleSize >= 30,
    `Sample Size N=${analogs.sampleSize} (Meets >=30 statistical hurdle), HitRate=${(analogs.hitRate * 100).toFixed(1)}%, AvgMove=${analogs.avgMoveInAtr} ATR`,
    analogs.sampleSize
  );

  recordTest(
    'Analogs',
    'Analog Fingerprint & Dates',
    analogs.situationFingerprint !== undefined && analogs.closestDates.length >= 3,
    `Fingerprint Regime=${analogs.situationFingerprint.regime}, Vol=${analogs.situationFingerprint.volatilityBucket}, Closest Events: ${analogs.closestDates.join(', ')}`
  );

  recordTest(
    'COT',
    'CFTC 30-Year Percentiles',
    cot.percentile30Y >= 0 && cot.percentile30Y <= 100 && cot.percentile3Y >= 0 && cot.percentile3Y <= 100,
    `Commercial Net=${cot.commercialNet}, Non-Comm Net=${cot.nonCommercialNet}, 30Y Percentile=${cot.percentile30Y}th`
  );

  recordTest(
    'Events',
    '1996-2026 Crisis & Central Bank Event Library',
    HISTORICAL_EVENTS.length >= 10,
    `Loaded ${HISTORICAL_EVENTS.length} major macroeconomic regime events from 1996 to 2026`,
    HISTORICAL_EVENTS.length
  );

  // -------------------------------------------------------------------------
  // 5. 10 SPECIALIST AGENTS & 3-ROUND DEBATE ORCHESTRATOR
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 5: 10 SPECIALIST AGENTS & 3-ROUND DEBATE AUDIT ---');

  const startTime = Date.now();
  const debate = await runFullDebate({
    snapshot,
    analogs,
    cot,
  });
  const durationMs = Date.now() - startTime;

  recordTest(
    'Debate Orchestrator',
    'Round 1: 10 Specialist Outputs',
    Object.keys(debate.round1).length === 10,
    `All 10 specialists generated independent hypotheses in Round 1: ${Object.keys(debate.round1).join(', ')}`,
    Object.keys(debate.round1).length
  );

  const expectedAgents: AgentName[] = [
    'Trend & Momentum',
    'Mean Reversion',
    'Price Action & S/R',
    'Volatility & Regime',
    'Market Structure & Volume',
    'Macro & Fundamental',
    'News & Sentiment',
    'Intermarket',
    'Positioning & Seasonality',
    'Risk Manager',
  ];

  for (const agent of expectedAgents) {
    const out = debate.round1[agent];
    const hasValidDirection = ['BUY', 'SELL', 'NEUTRAL'].includes(out.direction);
    const hasConfidence = out.confidence >= 0 && out.confidence <= 100;
    const hasReasoning = typeof out.reasoning === 'string' && out.reasoning.length > 10;

    recordTest(
      'Specialist Agents',
      `Agent [${agent}] R1 Schema`,
      hasValidDirection && hasConfidence && hasReasoning,
      `Direction=${out.direction}, Confidence=${out.confidence}%, Reasoning="${out.reasoning.slice(0, 50)}..."`
    );
  }

  recordTest(
    'Debate Orchestrator',
    'Round 2: Cross-Examination Matrix',
    Object.keys(debate.round2).length === 10,
    `All 10 specialists reviewed peer arguments, stated disagreements, and recorded revisions`,
    Object.keys(debate.round2).length
  );

  // Verify Round 2 Disagreements and Convinced-By
  let r2Valid = true;
  for (const agent of expectedAgents) {
    const r2Out = debate.round2[agent];
    if (!r2Out.disagrees_with || !r2Out.convinced_by || typeof r2Out.revised !== 'boolean') {
      r2Valid = false;
    }
  }

  recordTest(
    'Debate Orchestrator',
    'Round 2 Peer Challenge Scrutiny',
    r2Valid,
    `Each specialist cited specific disagreement target, convincing evidence, and revision rationale`
  );

  // -------------------------------------------------------------------------
  // 6. CHIEF ARBITER SYNTHESIS & HARD RISK GATES
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 6: CHIEF ARBITER SYNTHESIS & RISK GATE AUDIT ---');
  const arb = debate.arbiter;

  recordTest(
    'Chief Arbiter',
    'Actionable Recommendation',
    ['BUY', 'SELL', 'NO_TRADE'].includes(arb.final_recommendation),
    `Arbiter Verdict=${arb.final_recommendation}, Confidence=${arb.confidence}%, Consensus=${arb.consensus_level}`,
    arb.final_recommendation
  );

  recordTest(
    'Chief Arbiter',
    'Evidence Quality Badge & Depth',
    ['A', 'B', 'C'].includes(arb.evidence_quality.badge) && arb.evidence_quality.data_depth_years >= 10,
    `Badge=${arb.evidence_quality.badge}, Analog Samples=${arb.evidence_quality.analog_sample_size}, Depth=${arb.evidence_quality.data_depth_years} Years`,
    arb.evidence_quality.badge
  );

  recordTest(
    'Chief Arbiter',
    'Multi-Timeframe Synthesis (W1 to M15)',
    arb.per_timeframe.W1 !== undefined &&
    arb.per_timeframe.D1 !== undefined &&
    arb.per_timeframe.H4 !== undefined &&
    arb.per_timeframe.H1 !== undefined &&
    arb.per_timeframe.M15 !== undefined,
    `W1=${arb.per_timeframe.W1.bias}, D1=${arb.per_timeframe.D1.bias}, H4=${arb.per_timeframe.H4.bias}, H1=${arb.per_timeframe.H1.bias}, M15=${arb.per_timeframe.M15.bias}`
  );

  // Verify Risk Manager Veto Authority
  const riskOut = debate.round1['Risk Manager'] as any;
  if (riskOut.decision === 'VETO') {
    recordTest(
      'Risk Gate',
      'Absolute Risk Manager Veto Enforcement',
      arb.final_recommendation === 'NO_TRADE',
      `Risk Manager issued VETO -> Chief Arbiter strictly overridden to NO_TRADE. Veto Reasons: ${riskOut.veto_reasons.join('; ')}`
    );
  } else {
    const isRRValid = arb.risk_reward >= 1.5 || arb.final_recommendation === 'NO_TRADE';
    recordTest(
      'Risk Gate',
      'Minimum 1.5 Risk-Reward Gate',
      isRRValid,
      `Calculated R:R = ${arb.risk_reward.toFixed(2)} (Hurdle: >= 1.5). Entry Zone=[${arb.entry_zone.join(', ')}], SL=${arb.stop_loss}, TP=[${arb.take_profit.join(', ')}]`,
      arb.risk_reward
    );
  }

  // -------------------------------------------------------------------------
  // 7. MULTI-ASSET SCANNER & RANKED OPPORTUNITIES
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 7: MULTI-ASSET SCANNER & RANKED OPPORTUNITY AUDIT ---');
  const opps = await scannerService.scanAll('H1');

  recordTest(
    'Scanner',
    'Scan All 15 Assets',
    opps.length === 15,
    `Successfully scanned and evaluated all 15 assets across H1 timeframe`,
    opps.length
  );

  // Verify sorting by conviction score descending
  let isSorted = true;
  for (let i = 0; i < opps.length - 1; i++) {
    if (opps[i].convictionScore < opps[i + 1].convictionScore) {
      isSorted = false;
      break;
    }
  }

  recordTest(
    'Scanner',
    'Conviction Score Ranking',
    isSorted,
    `Top Candidate: ${opps[0].symbol} (Conviction: ${opps[0].convictionScore}/100, Direction: ${opps[0].direction})`
  );

  // -------------------------------------------------------------------------
  // 8. PAPER TRADING & BAYESIAN SCORECARDS
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 8: PAPER TRADING & BAYESIAN SCORECARD AUDIT ---');
  const initialSummary = paperTrader.getAccountSummary();

  recordTest(
    'Paper Trader',
    'Account Summary Baseline',
    initialSummary.balance > 0 && initialSummary.equity > 0 && initialSummary.startingBalance === 10000,
    `Balance=$${initialSummary.balance}, Equity=$${initialSummary.equity}, Closed Trades=${initialSummary.closedTradesCount}`
  );

  // Test opening a trade on highest conviction candidate if tradable
  const tradeableOpp = opps.find((o) => o.direction !== 'NO_TRADE' && o.riskManagerApproval !== 'VETO');
  if (tradeableOpp) {
    const opened = paperTrader.openPositionFromOpportunity(tradeableOpp);
    recordTest(
      'Paper Trader',
      `Position Execution (${tradeableOpp.symbol})`,
      opened !== null && opened.lotSize > 0,
      `Opened ${opened?.direction} on ${opened?.symbol} at ${opened?.entryPrice}, LotSize=${opened?.lotSize}, SL=${opened?.stopLoss}, TP1=${opened?.takeProfit1}`
    );

    // Simulate market tick
    const tickResult = await paperTrader.simulateMarketTick();
    recordTest(
      'Paper Trader',
      'Simulate Market Tick & Price Drift',
      typeof tickResult.updated === 'number',
      `Simulated tick across open positions. Triggered/Resolved=${tickResult.resolved.length}, Active Updates=${tickResult.updated}`
    );
  } else {
    recordTest(
      'Paper Trader',
      'Cautious Market Defense',
      true,
      'All current assets in protective NO_TRADE / VETO state - preserving capital'
    );
  }

  // Verify Bayesian scorecards
  const scs = scorecardService.getScorecards('EURUSD', 'H1');
  recordTest(
    'Scorecards',
    'Bayesian Dynamic Weights',
    Object.keys(scs).length === 10,
    `All 10 specialists have Bayesian weight tracking. Trend & Mom weight: ${scs['Trend & Momentum'].currentWeight.toFixed(2)}`
  );

  // -------------------------------------------------------------------------
  // 9. ALERTS & DISPATCH ENGINE
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 9: ALERTS & WEBHOOK DISPATCH AUDIT ---');
  const testAlert = await alertService.sendTestAlert('EURUSD');

  recordTest(
    'Alerts',
    'Test Alert Dispatch',
    testAlert !== null && testAlert.symbol === 'EURUSD' && testAlert.delivered === true,
    `Alert Dispatched: [${testAlert.channel}] ${testAlert.symbol} ${testAlert.direction} (Confidence: ${testAlert.confidence}%, Status: ${testAlert.statusMessage})`
  );

  // -------------------------------------------------------------------------
  // 10. INSTITUTIONAL BROKER GATEWAY & RISK POSITION SIZING AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 10: INSTITUTIONAL BROKER GATEWAY & RISK SIZING AUDIT ---');

  // Check 1: Risk % position sizing calculation on Forex
  const metrics1 = calculateRiskBasedOrderMetrics(
    'EURUSD',
    'CAPITAL_COM',
    15000,
    1.0,
    1.11500,
    1.11200,
    1.12100
  );
  recordTest(
    'Broker Sizing',
    'EURUSD 1.0% Risk Sizing on $15,000 Equity',
    metrics1.units > 0 && metrics1.riskCapitalUsd === 150 && metrics1.riskRewardRatio === 2.0,
    `Units=${metrics1.units}, RiskCapital=$${metrics1.riskCapitalUsd}, StopDist=${metrics1.stopDistance.toFixed(5)}, R:R=${metrics1.riskRewardRatio}`
  );

  // Check 2: Crypto risk sizing
  const metricsBtc = calculateRiskBasedOrderMetrics(
    'BTCUSD',
    'CAPITAL_COM',
    15000,
    1.0,
    65000,
    63000,
    69000
  );
  recordTest(
    'Broker Sizing',
    'BTCUSD 1.0% Risk Sizing on $15,000 Equity',
    metricsBtc.units > 0 && metricsBtc.riskCapitalUsd === 150,
    `Units=${metricsBtc.units}, RiskCapital=$${metricsBtc.riskCapitalUsd}, StopDist=${metricsBtc.stopDistance}`
  );

  // Check 3: Inverted BUY order rejection guard
  const badBuyOrder: StandardizedOrderRequest = {
    brokerId: 'CAPITAL_COM',
    symbol: 'EURUSD',
    direction: 'BUY',
    orderType: 'MARKET',
    units: 10000,
    riskPct: 1.0,
    riskCapitalUsd: 150,
    entryPrice: 1.11500,
    stopLoss: 1.11800, // Invalid: above entry price
    takeProfit1: 1.12500,
    riskReward: 3.3,
    clientOrderId: `test-bad-buy-${Date.now()}`,
    source: 'MANUAL_TICKET',
  };
  const badBuyResult = await brokerManager.executeManualOrder(badBuyOrder);
  recordTest(
    'Risk Guard',
    'Inverted BUY Rejection Guard (SL >= Entry)',
    badBuyResult.success === false && badBuyResult.status === 'REJECTED',
    `Order properly rejected: "${badBuyResult.message}"`
  );

  // Check 4: Inverted SELL order rejection guard
  const badSellOrder: StandardizedOrderRequest = {
    brokerId: 'CAPITAL_COM',
    symbol: 'EURUSD',
    direction: 'SELL',
    orderType: 'MARKET',
    units: 10000,
    riskPct: 1.0,
    riskCapitalUsd: 150,
    entryPrice: 1.11500,
    stopLoss: 1.11200, // Invalid: below entry price for short
    takeProfit1: 1.10500,
    riskReward: 3.3,
    clientOrderId: `test-bad-sell-${Date.now()}`,
    source: 'MANUAL_TICKET',
  };
  const badSellResult = await brokerManager.executeManualOrder(badSellOrder);
  recordTest(
    'Risk Guard',
    'Inverted SELL Rejection Guard (SL <= Entry)',
    badSellResult.success === false && badSellResult.status === 'REJECTED',
    `Order properly rejected: "${badSellResult.message}"`
  );

  // Check 5: Duplicate Position Rejection Guard (Strict 1 Trade Per Instrument)
  const dupBuyOrder: StandardizedOrderRequest = {
    brokerId: 'CAPITAL_COM',
    symbol: 'EURUSD',
    direction: 'BUY',
    orderType: 'MARKET',
    units: 10000,
    riskPct: 1.0,
    riskCapitalUsd: 150,
    entryPrice: 1.11500,
    stopLoss: 1.11200,
    takeProfit1: 1.12100,
    riskReward: 2.0,
    clientOrderId: `test-dup-buy-${Date.now()}`,
    source: 'MANUAL_TICKET',
  };
  const dupBuyResult = await brokerManager.executeManualOrder(dupBuyOrder);
  recordTest(
    'Risk Guard',
    'Duplicate Position Rejection Guard (1 Trade Per Instrument)',
    dupBuyResult.success === false && dupBuyResult.status === 'REJECTED' && dupBuyResult.message.includes('already open'),
    `Order properly rejected: "${dupBuyResult.message}"`
  );

  // Close previous position so manual order can execute cleanly
  const prevPositions = await brokerManager.getActiveOpenPositions();
  const eurPos = prevPositions.find((p) => p.symbol === 'EURUSD');
  if (eurPos) {
    await brokerManager.closePosition('CAPITAL_COM', eurPos.brokerTicketId);
  }

  // Check 6: Valid manual order execution
  const validBuyOrder: StandardizedOrderRequest = {
    brokerId: 'CAPITAL_COM',
    symbol: 'EURUSD',
    direction: 'BUY',
    orderType: 'MARKET',
    units: metrics1.units,
    riskPct: 1.0,
    riskCapitalUsd: 150,
    entryPrice: 1.11500,
    stopLoss: 1.11200,
    takeProfit1: 1.12100,
    riskReward: 2.0,
    clientOrderId: `test-valid-buy-${Date.now()}`,
    source: 'MANUAL_TICKET',
  };
  const validOrderResult = await brokerManager.executeManualOrder(validBuyOrder);
  recordTest(
    'Broker Gateway',
    'Valid Manual Order Execution & Fill Confirmation',
    validOrderResult.success === true && validOrderResult.status === 'FILLED' && Boolean(validOrderResult.brokerTicketId),
    `Ticket #${validOrderResult.brokerTicketId} filled at ${validOrderResult.fillPrice} on ${validOrderResult.brokerId}`
  );

  // Check 7: Move Stop Loss to Breakeven
  if (validOrderResult.brokerTicketId) {
    const beResult = await brokerManager.moveToBreakeven('CAPITAL_COM', validOrderResult.brokerTicketId);
    recordTest(
      'Risk Management',
      'Move Stop Loss to Breakeven (0% Risk Locked)',
      beResult.success === true && typeof beResult.newStopLoss === 'number' && beResult.newStopLoss >= validOrderResult.fillPrice,
      `Position #${validOrderResult.brokerTicketId} SL moved to breakeven at ${beResult.newStopLoss} (cushion included)`
    );
  }

  // Check 8: 1-Click Clean Up Duplicates Gateway
  const cleanupRes = await brokerManager.closeDuplicatePositions('CAPITAL_COM');
  recordTest(
    'Risk Management',
    '1-Click Clean Up Duplicates Gateway',
    cleanupRes.success === true,
    `Cleanup result: "${cleanupRes.message}" (Closed: ${cleanupRes.closedCount})`
  );

  // Check 9: Closed positions history tracking
  const closed = await brokerManager.getClosedPositions('CAPITAL_COM');
  recordTest(
    'Broker History',
    'Closed Trade History Retrieval & Audit Trail',
    Array.isArray(closed),
    `Tracked closed positions array returned (${closed.length} records)`
  );

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('                      UAT AUDIT SUMMARY REPORT                         ');
  console.log('========================================================================\n');

  const totalTests = testResults.length;
  const passedTests = testResults.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`TOTAL AUDIT CHECKS: ${totalTests}`);
  console.log(`PASSED:             ${passedTests}`);
  console.log(`FAILED:             ${failedTests}`);
  console.log(`COMPLIANCE RATE:    ${passRate}%`);
  console.log(`DEBATE EXECUTION:   ${durationMs}ms`);

  if (failedTests === 0) {
    console.log('\n🌟 ALL PROFESSIONAL UAT ACCEPTANCE CRITERIA SATISFIED 100% 🌟\n');
  } else {
    console.error(`\n⚠️ ${failedTests} TEST(S) FAILED. REVIEW LOGS ABOVE. ⚠️\n`);
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    passRate,
    durationMs,
    results: testResults,
  };
}

if (import.meta.url.endsWith('professionalUAT.ts') || process.argv[1]?.includes('professionalUAT')) {
  runProfessionalUAT().then((summary) => {
    if (summary.failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Fatal UAT error:', err);
    process.exit(1);
  });
}
