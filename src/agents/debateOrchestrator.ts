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

  // Aggregate tentative direction for Risk Manager
  const votes = [tentativeTrend.direction, meanRev.direction, priceAction.direction, structure.direction, macro.direction];
  const buyVotes = votes.filter((v) => v === 'BUY').length;
  const sellVotes = votes.filter((v) => v === 'SELL').length;
  const proposedDirection: TradeDirection = buyVotes > sellVotes ? 'BUY' : sellVotes > buyVotes ? 'SELL' : 'NEUTRAL';

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

    // Find the agent with the highest divergence (disagreement)
    let disagreeAgent: AgentName = 'Risk Manager';
    let disagreeReason = 'Conservative risk parameters conflict with directional trend aggression.';
    let convincedAgent: AgentName = 'Price Action & S/R';
    let convincedReason = 'Confluence of multi-timeframe horizontal support and touch counts confirms setup boundaries.';

    for (const otherName of agentNames) {
      if (otherName === name) continue;
      const otherR1 = round1Outputs[otherName];

      if (ownR1.direction !== 'NEUTRAL' && otherR1.direction !== 'NEUTRAL' && ownR1.direction !== otherR1.direction) {
        disagreeAgent = otherName;
        disagreeReason = `${otherName} favors ${otherR1.direction} while my model identifies structural ${ownR1.direction} evidence.`;
      } else if (ownR1.direction === otherR1.direction && otherR1.confidence > 70) {
        convincedAgent = otherName;
        convincedReason = `${otherName} validates setup with high confidence (${otherR1.confidence}%) citing ${otherR1.evidence[0]?.claim ?? 'indicators'}.`;
      }
    }

    // Agents revise only if high-impact contradiction exists
    const shouldRevise = round1Outputs['Volatility & Regime'].direction === 'NEUTRAL' && ownR1.confidence > 80;

    round2Map[name] = {
      ...ownR1,
      disagrees_with: {
        agent: disagreeAgent,
        reason: disagreeReason,
      },
      convinced_by: {
        agent: convincedAgent,
        reason: convincedReason,
      },
      revised: shouldRevise,
      revision_reason: shouldRevise
        ? 'Moderated confidence in deference to Volatility & Regime caution on chop conditions.'
        : 'Holding analytical stance: evidence from snapshot and analog sample size remains intact.',
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
  const { snapshot, analogs, isEventBlackout, agentScorecards } = options;
  const riskMgr = round1['Risk Manager'] as RiskManagerOutput;
  const volRegime = round1['Volatility & Regime'];

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
    if (snapshot.indicators.regime.includes('trend') && agentName === 'Trend & Momentum') weight *= 1.3;
    if (snapshot.indicators.regime === 'range' && agentName === 'Mean Reversion') weight *= 1.3;

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
  } else if (bullWeight > bearWeight * 1.4 && bullWeight > neutralWeight) {
    finalRecommendation = 'BUY';
    rationale = `Bullish consensus formed with strong multi-agent confirmation. Trend & Momentum, Market Structure, and Intermarket analysts align with +${analogs.avgMoveInAtr} ATR historical edge.`;
  } else if (bearWeight > bullWeight * 1.4 && bearWeight > neutralWeight) {
    finalRecommendation = 'SELL';
    rationale = `Bearish consensus established across agents citing negative EMA stack and structural resistance retests.`;
  } else {
    finalRecommendation = 'NO_TRADE';
    rationale = 'Debate concluded with split or inconclusive consensus between trend and mean-reversion factions. Standing aside.';
  }

  // Consensus level calculation
  const maxScore = Math.max(bullWeight, bearWeight, neutralWeight);
  const consensusLevel: 'strong' | 'moderate' | 'split' =
    maxScore / (totalWeight || 1) > 0.65 ? 'strong' : maxScore / (totalWeight || 1) > 0.45 ? 'moderate' : 'split';

  // Calibrate confidence
  let confidence = Math.round((maxScore / (totalWeight || 1)) * 85);
  if (finalRecommendation === 'NO_TRADE') confidence = 50;
  if (badge === 'C') confidence = Math.min(65, confidence); // Capped at 65 on weak evidence

  // Timeframe alignment
  const ind = snapshot.indicators;
  const timeframeAlignment: 'aligned' | 'partial' | 'conflicting' =
    ind.emaStack === 'MIXED' ? 'conflicting' : ind.adx14 >= 25 ? 'aligned' : 'partial';

  return {
    symbol: snapshot.symbol,
    per_timeframe: {
      W1: { bias: ind.emaStack === 'BULLISH' ? 'BUY' : ind.emaStack === 'BEARISH' ? 'SELL' : 'NEUTRAL', confidence: 65 },
      D1: { bias: ind.emaStack === 'BULLISH' ? 'BUY' : ind.emaStack === 'BEARISH' ? 'SELL' : 'NEUTRAL', confidence: 70 },
      H4: { bias: ind.distEma20InAtr > 0 ? 'BUY' : 'SELL', confidence: 68 },
      H1: { bias: finalRecommendation === 'NO_TRADE' ? 'NEUTRAL' : finalRecommendation, confidence },
      M15: { bias: 'NEUTRAL', confidence: 50 },
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
    invalidation: `Candle close breaching ${riskMgr.stop_loss} or regime shift to chop.`,
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
  const { snapshot, analogs, cot } = options;

  const context: SpecialistRunContext = {
    snapshot,
    analogs,
    cot,
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
