import { AgentName } from './debate';
import { Timeframe } from './market';

export interface AgentScorecard {
  agentName: AgentName;
  symbol: string;
  timeframe: Timeframe;
  resolvedTrades: number;
  wins: number;
  losses: number;
  hitRate: number; // e.g. 0.62
  avgR: number; // average R-multiple
  profitFactor: number;
  maxDrawdownR: number;
  currentWeight: number; // Bayesian dynamic weighting (starts at 1.0)
  inSampleHitRate: number;
  outOfSampleHitRate: number;
  evidenceQualityBadge: 'A' | 'B' | 'C';
}

export interface RecommendationRecord {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  recommendation: 'BUY' | 'SELL' | 'NO_TRADE';
  confidence: number;
  entryZone: [number, number];
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  evidenceBadge: 'A' | 'B' | 'C';
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'EXPIRED' | 'VETOED';
  openedAt: number;
  resolvedAt?: number;
  actualReturnR?: number;
  consensusLevel: 'strong' | 'moderate' | 'split';
  rationale: string;
}

export interface EquityCurvePoint {
  timestamp: number;
  cumulativeR: number;
  tradesCount: number;
  winRate: number;
}
