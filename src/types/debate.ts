import { Timeframe } from './market';

export type AgentName =
  | 'Trend & Momentum'
  | 'Mean Reversion'
  | 'Price Action & S/R'
  | 'Volatility & Regime'
  | 'Market Structure & Volume'
  | 'Macro & Fundamental'
  | 'News & Sentiment'
  | 'Intermarket'
  | 'Positioning & Seasonality'
  | 'Risk Manager';

export type TradeDirection = 'BUY' | 'SELL' | 'NEUTRAL';

export interface AgentEvidence {
  source: 'analog' | 'kb_doc' | 'snapshot';
  claim: string;
  sample_size: number | null;
}

export interface BaseAgentOutput {
  agent: AgentName;
  symbol: string;
  direction: TradeDirection;
  confidence: number; // 0-100
  timeframe_bias: {
    W1: string;
    D1: string;
    H4: string;
    H1: string;
    M15: string;
  };
  key_levels: {
    support: number[];
    resistance: number[];
  };
  reasoning: string; // Max 120 words
  evidence: AgentEvidence[];
  invalidation_level: number;
  risks: string[];
  data_gaps: string[];
}

// Special fields for Agent 4 (Volatility & Regime)
export interface VolatilityAgentOutput extends BaseAgentOutput {
  regime: string;
  tradable: boolean;
  recommended_position_size_modifier: number;
}

// Special fields for Agent 7 (News & Sentiment)
export interface NewsAgentOutput extends BaseAgentOutput {
  event_risk: 'none' | 'low' | 'medium' | 'high';
  blackout_recommended: boolean;
}

// Special fields for Agent 10 (Risk Manager)
export interface RiskManagerOutput extends BaseAgentOutput {
  decision: 'APPROVE' | 'REDUCE_SIZE' | 'VETO';
  entry_zone: [number, number];
  stop_loss: number;
  take_profit: [number, number];
  risk_reward: number;
  size_modifier: number;
  veto_reasons: string[];
}

export type AnySpecialistOutput =
  | BaseAgentOutput
  | VolatilityAgentOutput
  | NewsAgentOutput
  | RiskManagerOutput;

// Round 2 Cross-Examination Output
export interface Round2AgentOutput extends BaseAgentOutput {
  disagrees_with: {
    agent: AgentName;
    reason: string;
  };
  convinced_by: {
    agent: AgentName;
    reason: string;
  };
  revised: boolean;
  revision_reason: string;
}

// Round 3 Arbiter Output
export interface ArbiterOutput {
  symbol: string;
  per_timeframe: {
    [key in Timeframe]: {
      bias: TradeDirection;
      confidence: number;
    };
  };
  final_recommendation: 'BUY' | 'SELL' | 'NO_TRADE';
  trade_timeframe: Timeframe;
  entry_zone: [number, number];
  stop_loss: number;
  take_profit: [number, number];
  risk_reward: number;
  size_modifier: number;
  confidence: number;
  consensus_level: 'strong' | 'moderate' | 'split';
  timeframe_alignment: 'aligned' | 'partial' | 'conflicting';
  strongest_bull_case: string;
  strongest_bear_case: string;
  key_disagreement: string;
  invalidation: string;
  evidence_quality: {
    analog_sample_size: number;
    regime_match: 'high' | 'medium' | 'low';
    data_depth_years: number;
    badge: 'A' | 'B' | 'C';
  };
  agent_contributions: Array<{
    agent: AgentName;
    vote: TradeDirection;
    weight: number;
    influence: 'high' | 'med' | 'low';
  }>;
  rationale: string;
  disclaimer: string;
}

export interface FullDebateTranscript {
  scanId: string;
  symbol: string;
  timestamp: number;
  round1: Record<string, AnySpecialistOutput>;
  round2: Record<string, Round2AgentOutput>;
  arbiter: ArbiterOutput;
}
