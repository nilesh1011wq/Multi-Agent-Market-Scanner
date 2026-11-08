/**
 * Core domain types for market data, indicators, feature snapshots, and analogs.
 */

export type Timeframe = 'M15' | 'H1' | 'H4' | 'D1' | 'W1';

export type AssetClass = 'FOREX' | 'COMMODITY' | 'CRYPTO';

export interface SymbolConfig {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  pipSize: number;
  digits: number;
  minSpread: number;
  yahooTicker: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type RegimeLabel =
  | 'trend_bull'
  | 'trend_bear'
  | 'range'
  | 'chop'
  | 'breakout'
  | 'volatility_expansion';

export interface PivotLevels {
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface SRCluster {
  price: number;
  type: 'support' | 'resistance';
  touches: number;
  timeframe: Timeframe;
  recencyBars: number;
}

export interface SwingStructure {
  lastSwingHigh: number;
  lastSwingLow: number;
  structure: 'BULLISH' | 'BEARISH' | 'TRANSITIONING';
  bos: boolean; // Break of Structure
  choch: boolean; // Change of Character
  liquiditySweep: 'BUY_SIDE' | 'SELL_SIDE' | null;
}

export interface CandlestickPatterns {
  bullishEngulfing: boolean;
  bearishEngulfing: boolean;
  pinBar: 'BULLISH' | 'BEARISH' | null;
  insideBar: boolean;
  doji: boolean;
}

export interface TechnicalIndicators {
  ema20: number;
  ema50: number;
  ema200: number;
  emaStack: 'BULLISH' | 'BEARISH' | 'MIXED';
  distEma20InAtr: number;
  rsi14: number;
  stochK: number;
  stochD: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  };
  adx14: number;
  atr14: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  };
  volatilityPercentile1Y: number;
  volatilityPercentile10Y: number;
  pivots: PivotLevels;
  srClusters: SRCluster[];
  swingStructure: SwingStructure;
  patterns: CandlestickPatterns;
  regime: RegimeLabel;
  tradable: boolean;
}

/**
 * Compact snapshot JSON transmitted to specialist agents.
 * Strictly deterministic, zero LLM hallucination.
 */
export interface FeatureSnapshot {
  symbol: string;
  timeframe: Timeframe;
  timestamp: number;
  currentPrice: number;
  indicators: TechnicalIndicators;
}

export interface MultiTimeframeSnapshot {
  symbol: string;
  timestamp: number;
  currentPrice: number;
  timeframes: {
    [key in Timeframe]: TechnicalIndicators;
  };
}

export interface SituationFingerprint {
  symbol: string;
  regime: RegimeLabel;
  volatilityBucket: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  momentumZone: 'OVERSOLD' | 'BEARISH' | 'NEUTRAL' | 'BULLISH' | 'OVERBOUGHT';
  emaAlignment: 'BULLISH' | 'BEARISH' | 'MIXED';
  upcomingEventType: 'CENTRAL_BANK' | 'INFLATION' | 'EMPLOYMENT' | 'GEOPOLITICAL' | 'NONE';
  cotPercentileZone: 'EXTREME_SHORT' | 'NEUTRAL' | 'EXTREME_LONG';
}

export interface AnalogStats {
  situationFingerprint: SituationFingerprint;
  sampleSize: number;
  isSufficientEvidence: boolean; // True if sampleSize >= 30
  hitRate: number; // 0.0 to 1.0
  avgMoveInAtr: number;
  maxDrawdownInAtr: number;
  closestDates: string[]; // e.g. ["2008-10-15", "2015-01-15", "2020-03-18"]
  regimeMatch: 'high' | 'medium' | 'low';
  dataDepthYears: number;
}

export interface HistoricalEvent {
  id: string;
  name: string;
  category: 'CENTRAL_BANK' | 'CRISIS' | 'INFLATION_SHOCK' | 'WAR_GEOPOLITICAL';
  date: string;
  macroRegime: string;
  description: string;
  postReturns: {
    plus1h: number;
    plus1d: number;
    plus1w: number;
    plus1m: number;
  };
}

export interface COTData {
  symbol: string;
  reportDate: string;
  commercialNet: number;
  nonCommercialNet: number;
  percentile3Y: number;
  percentile30Y: number;
  isExtremeLong: boolean;
  isExtremeShort: boolean;
}

export interface EconomicEvent {
  id: string;
  title: string;
  currency: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  scheduledTime: number; // Unix timestamp
  actual?: string;
  forecast?: string;
  previous?: string;
  blackoutMins: number;
}
