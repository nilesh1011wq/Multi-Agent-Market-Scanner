import { Candle, COTData, EconomicEvent, Timeframe } from '../types/market';

export interface MarketNewsItem {
  id: string;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Pluggable data-provider interface.
 * Allows swapping between Yahoo Finance / Alpha Vantage / Finnhub / IG Markets / Twelve Data.
 */
export interface IDataProvider {
  name: string;
  getCandles(symbol: string, timeframe: Timeframe, n?: number): Promise<Candle[]>;
  getNews(symbol: string): Promise<MarketNewsItem[]>;
  getEconomicCalendar(): Promise<EconomicEvent[]>;
  getCOT(symbol: string): Promise<COTData>;
}
