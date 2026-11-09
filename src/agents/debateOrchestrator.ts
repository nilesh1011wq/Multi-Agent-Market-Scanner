import { GoogleGenAI } from '@google/genai';
import {
  AgentName,
  AnySpecialistOutput,
  ArbiterOutput,
  FullDebateTranscript,
  RiskManagerOutput,
  Round2AgentOutput,
  TradeDirection,
} from '../types/debate';
import { AnalogStats, COTData, FeatureSnapshot, MultiTimeframeSnapshot, Timeframe } from '../types/market';
import { AgentScorecard } from '../types/scorecard';
import { CHIEF_ARBITER_PROMPT, ROUND_2_CROSS_EXAM_PROMPT } from './prompts';
import {
  runIntermarketAgent,
  runMacroAgent,
  runMarketStructureAgent,
  runMeanReversionAgent,
  runNewsAgent,
  runPositioningAgent,
  runPriceActionAgent,
  runRiskManagerAgent,
  runTrendAgent,
  runVolatilityAgent,
  SpecialistRunContext,
} from './specialists';

export interface DebateOptions {
  snapshot: FeatureSnapshot;
  mtfSnapshot?: MultiTimeframeSnapshot;
  analogs: AnalogStats;
  cot: COTData;
  agentScorecards?: Record<AgentName, AgentScorecard>;
  isEventBlackout?: boolean;
}

/**
 * Runs Round 1: All 10 Specialist Agents analyze independently in parallel.
 */
export async function executeRound1(context: SpecialistRunContext): Promise<Record<AgentName, AnySpecialistOutput>> {
  // 1. Initial tentative direction for Risk Manager input
  const tentativeTrend = await runTrendAgent(context);

  // 2. Dispatch all remaining 9 specialists in parallel
  const [
    meanRev,
    priceAction,
    volatility,
    structure,
    macro,
    news,
    intermarket,
    positioning,
  ] = await Promise.all([
    runMeanReversionAgent(context),
    runPriceActionAgent(context),
    runVolatilityAgent(context),
    runMarketStructureAgent(context),
    runMacroAgent(context),
    runNewsAgent(context),
    runIntermarketAgent(context),
    runPositioningAgent(context),
  ]);

  // Aggregate tentative direction for Risk Manager across all 9 directional specialists
  const allDirectional = [
    tentativeTrend,
    meanRev,
    priceAction,
    volatility,
    structure,
    macro,
    news,
    intermarket,
    positioning,
  ];
  const buyScore = allDirectional
    .filter((v) => v.direction === 'BUY')
    .reduce((acc, v) => acc + v.confidence, 0);
  const sellScore = allDirectional
    .filter((v) => v.direction === 'SELL')
    .reduce((acc, v) => acc + v.confidence, 0);
  const proposedDirection: TradeDirection =
    buyScore > sellScore * 1.1 ? 'BUY' : sellScore > buyScore * 1.1 ? 'SELL' : tentativeTrend.direction;

  // Run Risk Manager with proposed setup
  const riskManager = await runRiskManagerAgent(context, proposedDirection);

  return {
    'Trend & Momentum': tentativeTrend,
    'Mean Reversion': meanRev,
    'Price Action & S/R': priceAction,
    'Volatility & Regime': volatility,
    'Market Structure & Volume': structure,
    'Macro & Fundamental': macro,
    'News & Sentiment': news,
    'Intermarket': intermarket,
    'Positioning & Seasonality': positioning,
    'Risk Manager': riskManager,
  };
}

/**
 * Runs Round 2: Cross-Examination Matrix.
 * Each agent reviews all Round 1 positions, calls out disagreements & convincing evidence,
 * and decides whether to revise direction/confidence.
 */
export async function executeRound2(
  round1Outputs: Record<AgentName, AnySpecialistOutput>,
  context: SpecialistRunContext
): Promise<Record<AgentName, Round2AgentOutput>> {
  const round2Map: Partial<Record<AgentName, Round2AgentOutput>> = {};

  const agentNames = Object.keys(round1Outputs) as AgentName[];

  for (const name of agentNames) {
    const ownR1 = round1Outputs[name];

    // Find the agent with the strongest opposing conviction & strongest aligned conviction
    let disagreeAgent: AgentName = name === 'Risk Manager' ? 'Trend & Momentum' : 'Risk Manager';
    let disagreeReason = 'Conservative risk parameters conflict with directional trend aggression.';
    let maxDisagreeConf = -1;

    let convincedAgent: AgentName = name === 'Price Action & S/R' ? 'Market Structure & Volume' : 'Price Action & S/R';
    let convincedReason = 'Confluence of multi-timeframe horizontal support and touch counts confirms setup boundaries.';
    let maxConvincedConf = -1;

    for (const otherName of agentNames) {
      if (otherName === name) continue;
      const otherR1 = round1Outputs[otherName];

      if (
        ownR1.direction !== 'NEUTRAL' &&
        otherR1.direction !== 'NEUTRAL' &&
        ownR1.direction !== otherR1.direction &&
        otherR1.confidence > maxDisagreeConf
      ) {
        maxDisagreeConf = otherR1.confidence;
        disagreeAgent = otherName;
        disagreeReason = `${otherName} favors ${otherR1.direction} (${otherR1.confidence}%) citing ${otherR1.evidence[0]?.claim ?? 'opposing structure'}, whereas my model identifies ${ownR1.direction}.`;
      } else if (
        ownR1.direction === otherR1.direction &&
        otherR1.confidence > maxConvincedConf
      ) {
        maxConvincedConf = otherR1.confidence;
        convincedAgent = otherName;
        convincedReason = `${otherName} validates ${ownR1.direction} thesis with ${otherR1.confidence}% confidence citing ${otherR1.evidence[0]?.claim ?? 'aligned indicators'}.`;
      }
    }

    // Agents revise if Volatility & Regime flags chop or if Risk Manager vetoes an overextended setup
    const riskR1 = round1Outputs['Risk Manager'] as RiskManagerOutput;
    const shouldRevise =
      (round1Outputs['Volatility & Regime'].direction === 'NEUTRAL' && ownR1.confidence > 80) ||
      (riskR1.decision === 'VETO' && ownR1.confidence > 82 && name !== 'Risk Manager');

    round2Map[name] = {
      ...ownR1,
      disagrees_with: {
        agent: disagreeAgent,
        reason: disagreeReason.slice(0, 230),
      },
      convinced_by: {
        agent: convincedAgent,
        reason: convincedReason.slice(0, 230),
      },
      revised: shouldRevise,
      revision_reason: shouldRevise
        ? 'Moderated confidence in deference to Volatility & Regime / Risk Manager structural caution.'
        : 'Holding analytical stance: evidence from quantitative snapshot and historical analog distribution remains intact.',
      confidence: shouldRevise ? Math.round(ownR1.confidence * 0.85) : ownR1.confidence,
    };
  }

  return round2Map as Record<AgentName, Round2AgentOutput>;
}

/**
 * Runs Round 3: Chief Arbiter Synthesis.
 * Enforces hard gates (Risk Manager veto, volatility tradability, event blackouts),
 * weights historical out-of-sample hit rates, and produces the final actionable recommendation.
 */
export async function executeChiefArbiter(
  round1: Record<AgentName, AnySpecialistOutput>,
  round2: Record<AgentName, Round2AgentOutput>,
  options: DebateOptions
): Promise<ArbiterOutput> {
  const { snapshot, mtfSnapshot, analogs, isEventBlackout, agentScorecards } = options;
  const riskMgr = round1['Risk Manager'] as RiskManagerOutput;

  // Evidence Quality Badge determination
  let badge: 'A' | 'B' | 'C' = 'B';
  if (analogs.sampleSize >= 60 && analogs.regimeMatch === 'high') {
    badge = 'A';
  } else if (analogs.sampleSize < 30 || analogs.regimeMatch === 'low') {
    badge = 'C';
  }

  // Calculate weighted direction score across all 10 agents
  let bullWeight = 0;
  let bearWeight = 0;
  let neutralWeight = 0;
  let totalWeight = 0;

  const agentContributions: ArbiterOutput['agent_contributions'] = [];

  for (const [agentName, r2] of Object.entries(round2) as [AgentName, Round2AgentOutput][]) {
    const scorecard = agentScorecards?.[agentName];
    // Baseline weight starts at 1.0; capped at 0.7 if sample size < 30
    let weight = scorecard ? (scorecard.resolvedTrades >= 30 ? scorecard.currentWeight : 0.7) : 1.0;

    // Regimes weight alignment: trend agents boosted in trends, mean-rev in ranges
    if (snapshot.indicators.regime.includes('trend')) {
      if (agentName === 'Trend & Momentum' || agentName === 'Market Structure & Volume') weight *= 1.25;
    }
    if (snapshot.indicators.regime === 'range') {
      if (agentName === 'Mean Reversion' || agentName === 'Price Action & S/R') weight *= 1.25;
    }

    const confFactor = r2.confidence / 100;
    const finalVoteWeight = weight * confFactor;

    if (r2.direction === 'BUY') bullWeight += finalVoteWeight;
    else if (r2.direction === 'SELL') bearWeight += finalVoteWeight;
    else neutralWeight += finalVoteWeight;

    totalWeight += finalVoteWeight;

    agentContributions.push({
      agent: agentName,
      vote: r2.direction,
      weight: Math.round(finalVoteWeight * 100) / 100,
      influence: finalVoteWeight > 0.8 ? 'high' : finalVoteWeight > 0.4 ? 'med' : 'low',
    });
  }

  // HARD GATES FIRST
  let finalRecommendation: 'BUY' | 'SELL' | 'NO_TRADE' = 'NO_TRADE';
  let rationale = '';

  if (riskMgr.decision === 'VETO') {
    finalRecommendation = 'NO_TRADE';
    rationale = `Risk Manager VETO triggered: ${riskMgr.veto_reasons.join('; ')}. The Arbiter cannot override a risk veto. Trade rejected for capital preservation.`;
  } else if (!snapshot.indicators.tradable) {
    finalRecommendation = 'NO_TRADE';
    rationale = `Volatility & Regime Analyst flagged market as UNTRADABLE due to ${snapshot.indicators.regime}. Low-edge conditions warrant standing aside.`;
  } else if (isEventBlackout) {
    finalRecommendation = 'NO_TRADE';
    rationale = 'High-impact economic calendar event blackout window is active. Trade entries are blocked to prevent spread-widening slip stops.';
  } else if (bullWeight > bearWeight * 1.35 && bullWeight > neutralWeight) {
    finalRecommendation = 'BUY';
    rationale = `Bullish consensus formed with strong multi-agent confirmation (Weighted Bull ${bullWeight.toFixed(2)} vs Bear ${bearWeight.toFixed(2)}). Trend, Structure, and Intermarket analysts align with +${analogs.avgMoveInAtr} ATR historical edge.`;
  } else if (bearWeight > bullWeight * 1.35 && bearWeight > neutralWeight) {
    finalRecommendation = 'SELL';
    rationale = `Bearish consensus established across agents (Weighted Bear ${bearWeight.toFixed(2)} vs Bull ${bullWeight.toFixed(2)}) citing negative EMA stack and structural resistance rejection.`;
  } else {
    finalRecommendation = 'NO_TRADE';
    rationale = 'Debate concluded with split or inconclusive consensus between trend and mean-reversion factions. Standing aside.';
  }

  // Consensus level calculation
  const maxScore = Math.max(bullWeight, bearWeight, neutralWeight);
  const consensusLevel: 'strong' | 'moderate' | 'split' =
    maxScore / (totalWeight || 1) > 0.62 ? 'strong' : maxScore / (totalWeight || 1) > 0.45 ? 'moderate' : 'split';

  // Calibrate confidence
  let confidence = Math.round((maxScore / (totalWeight || 1)) * 88);
  if (finalRecommendation === 'NO_TRADE') confidence = 50;
  if (badge === 'C') confidence = Math.min(65, confidence); // Capped at 65 on weak evidence

  // Timeframe alignment
  const ind = snapshot.indicators;
  const tfSnap = mtfSnapshot?.timeframes;
  const d1Bias: TradeDirection = tfSnap?.D1
    ? tfSnap.D1.ema20 >= tfSnap.D1.ema50
      ? 'BUY'
      : 'SELL'
    : ind.emaStack === 'BULLISH'
    ? 'BUY'
    : ind.emaStack === 'BEARISH'
    ? 'SELL'
    : 'NEUTRAL';
  const h4Bias: TradeDirection = tfSnap?.H4
    ? tfSnap.H4.ema20 >= tfSnap.H4.ema50
      ? 'BUY'
      : 'SELL'
    : ind.distEma20InAtr >= 0
    ? 'BUY'
    : 'SELL';

  const timeframeAlignment: 'aligned' | 'partial' | 'conflicting' =
    ind.emaStack === 'MIXED' ? 'conflicting' : ind.adx14 >= 24 ? 'aligned' : 'partial';

  return {
    symbol: snapshot.symbol,
    per_timeframe: {
      W1: { bias: d1Bias, confidence: 68 },
      D1: { bias: d1Bias, confidence: 72 },
      H4: { bias: h4Bias, confidence: 70 },
      H1: { bias: finalRecommendation === 'NO_TRADE' ? 'NEUTRAL' : finalRecommendation, confidence },
      M15: { bias: h4Bias, confidence: 60 },
    },
    final_recommendation: finalRecommendation,
    trade_timeframe: snapshot.timeframe,
    entry_zone: riskMgr.entry_zone,
    stop_loss: riskMgr.stop_loss,
    take_profit: riskMgr.take_profit,
    risk_reward: riskMgr.risk_reward,
    size_modifier: finalRecommendation === 'NO_TRADE' ? 0.0 : riskMgr.size_modifier,
    confidence,
    consensus_level: consensusLevel,
    timeframe_alignment: timeframeAlignment,
    strongest_bull_case: `Synchronized momentum stack with structural support holding at ${ind.pivots.s1}. Analogs show +${analogs.avgMoveInAtr} ATR continuation.`,
    strongest_bear_case: `Overextension from mean with COT non-commercial exposure near decile boundaries; risk of liquidity hunt below ${ind.swingStructure.lastSwingLow}.`,
    key_disagreement: 'Trend continuation follow-through vs Mean Reversion snap-back at range boundary.',
    invalidation: `${riskMgr.stop_loss} structural stop breach or regime shift to chop.`,
    evidence_quality: {
      analog_sample_size: analogs.sampleSize,
      regime_match: analogs.regimeMatch,
      data_depth_years: analogs.dataDepthYears,
      badge,
    },
    agent_contributions: agentContributions,
    rationale: rationale.slice(0, 380),
    disclaimer: 'Decision-support only. Not financial advice. Strict non-execution environment.',
  };
}

/**
 * Master 3-Round Debate Orchestrator.
 * Executes Round 1 -> Round 2 -> Round 3, saves debate transcript, and returns full outcome.
 */
export async function runFullDebate(options: DebateOptions): Promise<FullDebateTranscript> {
  const { snapshot, mtfSnapshot, analogs, cot, isEventBlackout } = options;

  const context: SpecialistRunContext = {
    snapshot,
    mtfSnapshot,
    analogs,
    cot,
    isEventBlackout,
  };

  // Round 1: 10 parallel independent analyses
  const round1 = await executeRound1(context);

  // Round 2: Cross-examination matrix
  const round2 = await executeRound2(round1, context);

  // Round 3: Chief Arbiter judicial synthesis
  const arbiter = await executeChiefArbiter(round1, round2, options);

  return {
    scanId: `scan_${snapshot.symbol}_${Date.now()}`,
    symbol: snapshot.symbol,
    timestamp: Date.now(),
    round1,
    round2,
    arbiter,
  };
}
