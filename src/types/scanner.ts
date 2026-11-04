import { Timeframe } from './market';
import { AgentName } from './debate';

export interface RankedOpportunity {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  direction: 'BUY' | 'SELL' | 'NO_TRADE';
  confidence: number;
  convictionScore: number;
  entryZone: [number, number];
  stopLoss: number;
  takeProfits: [number, number];
  riskReward: number;
  evidenceBadge: 'A' | 'B' | 'C';
  regime: string;
  consensus: {
    buy: number;
    sell: number;
    neutral: number;
  };
  riskManagerApproval: 'APPROVED' | 'VETO' | 'REDUCE_SIZE';
  arbiterSummary: string;
  detectedAt: number;
  preFilterPassed: boolean;
  preFilterReason: string;
  invalidationLevel: number;
}

export interface AlertConfig {
  minConfidence: number;
  minRiskReward: number;
  allowedBadges: Array<'A' | 'B' | 'C'>;
  blockOnEconomicEvent: boolean;
  webhookUrl: string;
  notificationsEnabled: boolean;
}

export interface DispatchedAlert {
  id: string;
  opportunityId: string;
  symbol: string;
  timeframe: Timeframe;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryZone: [number, number];
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  evidenceBadge: 'A' | 'B' | 'C';
  firedAt: number;
  delivered: boolean;
  channel: 'WEBHOOK' | 'IN_APP';
  statusMessage: string;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  lotSize: number;
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'STOPPED_OUT' | 'CLOSED';
  realizedPnLR: number;
  unrealizedPnLR: number;
  openedAt: number;
  closedAt?: number;
  exitPrice?: number;
  agentVotesAtOpen: Record<AgentName, 'BUY' | 'SELL' | 'NEUTRAL'>;
  evidenceBadge: 'A' | 'B' | 'C';
  notes: string;
}

export interface PaperAccountSummary {
  balance: number;
  equity: number;
  startingBalance: number;
  openPositionsCount: number;
  closedTradesCount: number;
  winRate: number;
  totalRealizedR: number;
  maxDrawdownR: number;
}
