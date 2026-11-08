/**
 * Broker Gateway & Execution Types for Capital.com, MT5, and IG Markets
 */

export type BrokerId = 'CAPITAL_COM' | 'MT5' | 'IG';

export type BrokerEnvironment = 'DEMO' | 'LIVE';

export type BrokerConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface BrokerConfig {
  id: BrokerId;
  name: string;
  environment: BrokerEnvironment;
  apiKey: string;
  apiSecret?: string;          // Password, secret key, or CST session token
  accountId?: string;          // Trading account ID
  identifier?: string;         // Username / Email (e.g. for Capital.com session creation)
  serverName?: string;         // MT5 Server (e.g., 'MetaQuotes-Demo')
  isActive: boolean;           // Currently selected for execution
  isAutoExecutionEnabled: boolean;
  lastConnectedAt?: number;
  status: BrokerConnectionStatus;
  latencyMs?: number;
  errorMessage?: string;
  customStartingBalance?: number;
  hasSavedApiKey?: boolean;
  hasSavedApiSecret?: boolean;
  hasSavedIdentifier?: boolean;
  isRealBrokerConnected?: boolean;
}

export interface StandardizedOrderRequest {
  brokerId: BrokerId;
  symbol: string;              // Normalized symbol: EURUSD, XAUUSD, WTI, etc.
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  units: number;               // Normalized lot/contract volume
  entryPrice?: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  riskReward: number;
  clientOrderId: string;
  source: 'AUTO_ARBITER' | 'MANUAL_TICKET' | 'SCANNER';
}

export interface BrokerOrderResult {
  success: boolean;
  brokerId: BrokerId;
  brokerTicketId?: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  units: number;
  fillPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
  status: 'FILLED' | 'REJECTED' | 'PENDING';
  message: string;
  rawResponse?: any;
}

export interface BrokerPosition {
  id: string;                  // Internal unique ID
  brokerId: BrokerId;
  brokerTicketId: string;      // Deal ID or Position Ticket from broker
  symbol: string;
  direction: 'BUY' | 'SELL';
  units: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnL: number;       // Currency PnL
  unrealizedPnLR: number;      // Risk-adjusted R PnL
  openedAt: number;
  environment: BrokerEnvironment;
}

export interface BrokerAccountSummary {
  brokerId: BrokerId;
  brokerName: string;
  environment: BrokerEnvironment;
  currency: string;
  balance: number;
  equity: number;
  marginUsed: number;
  marginFree: number;
  marginLevelPct: number;
  unrealizedPnL: number;
  openPositionsCount: number;
  isConnected: boolean;
  lastSyncedAt: number;
  isRealBrokerAccount?: boolean;
  accountSource?: 'LIVE_BROKER_API' | 'CALIBRATED_SANDBOX';
  brokerAccountId?: string;
}

export interface IBrokerAdapter {
  readonly id: BrokerId;
  readonly name: string;

  connect(config: BrokerConfig): Promise<{ success: boolean; latencyMs: number; message: string }>;
  disconnect(): Promise<void>;
  getAccountSummary(): Promise<BrokerAccountSummary>;
  getOpenPositions(): Promise<BrokerPosition[]>;
  placeOrder(order: StandardizedOrderRequest): Promise<BrokerOrderResult>;
  closePosition(ticketId: string): Promise<{ success: boolean; message: string }>;
  flattenAll(): Promise<{ closedCount: number; errors: string[] }>;
}
