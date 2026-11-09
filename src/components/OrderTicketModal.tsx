import React, { useState, useEffect } from 'react';
import { BrokerAccountSummary, BrokerConfig, StandardizedOrderRequest } from '../types/broker';
import { WATCHLIST } from '../data/marketDataService';
import {
  getBrokerSymbol,
  getBrokerSymbolDetails,
  calculateRiskBasedOrderMetrics,
} from '../broker/symbolMapper';
import {
  X,
  Sliders,
  AlertTriangle,
  Send,
  Tag,
  Radio,
  ShieldCheck,
} from 'lucide-react';

interface OrderTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBroker: BrokerConfig;
  accountSummary?: BrokerAccountSummary | null;
  defaultSymbol?: string;
  defaultDirection?: 'BUY' | 'SELL';
  defaultEntryPrice?: number;
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
  onSubmitOrder: (order: StandardizedOrderRequest) => Promise<void>;
}

const RISK_PRESETS = [0.5, 1.0, 1.5, 2.0];

export const OrderTicketModal: React.FC<OrderTicketModalProps> = ({
  isOpen,
  onClose,
  activeBroker,
  accountSummary,
  defaultSymbol = 'EURUSD',
  defaultDirection = 'BUY',
  defaultEntryPrice,
  defaultStopLoss,
  defaultTakeProfit,
  onSubmitOrder,
}) => {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [direction, setDirection] = useState<'BUY' | 'SELL'>(defaultDirection);
  const [riskPct, setRiskPct] = useState<number>(activeBroker.defaultRiskPct || 1.0);
  const [units, setUnits] = useState(1000);
  const [entryPrice, setEntryPrice] = useState(defaultEntryPrice || 1.1143);
  const [stopLoss, setStopLoss] = useState(defaultStopLoss || 1.1100);
  const [takeProfit, setTakeProfit] = useState(defaultTakeProfit || 1.1220);
  const [liveBid, setLiveBid] = useState<number | null>(null);
  const [liveAsk, setLiveAsk] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const brokerEpic = getBrokerSymbol(symbol, activeBroker.id);
  const brokerDetails = getBrokerSymbolDetails(symbol, activeBroker.id);
  const liveEquity = accountSummary?.equity && accountSummary.equity > 0 ? accountSummary.equity : 15000;

  // Reset state when modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      setSymbol(defaultSymbol);
      setDirection(defaultDirection);
      setRiskPct(activeBroker.defaultRiskPct || 1.0);
      if (defaultEntryPrice) setEntryPrice(defaultEntryPrice);
      if (defaultStopLoss) setStopLoss(defaultStopLoss);
      if (defaultTakeProfit) setTakeProfit(defaultTakeProfit);
      setErrorMsg(null);
    }
  }, [isOpen, defaultSymbol, defaultDirection, defaultEntryPrice, defaultStopLoss, defaultTakeProfit, activeBroker.defaultRiskPct]);

  // When opening or changing symbol/direction, fetch the latest real live quote
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchQuote() {
      try {
        const res = await fetch(`/api/quote?symbol=${symbol}`);
        const data = await res.json();
        if (data.success && data.quote && isMounted) {
          const q = data.quote;
          const currentPrice = direction === 'BUY' ? q.ask : q.bid;
          setLiveBid(q.bid);
          setLiveAsk(q.ask);

          // If entry price wasn't explicitly provided, sync with live quote
          if (!defaultEntryPrice || symbol !== defaultSymbol) {
            setEntryPrice(currentPrice);
          }

          // If SL / TP were not custom specified, calibrate with 1:2 R:R
          if (!defaultStopLoss || symbol !== defaultSymbol) {
            const pipFactor = symbol.includes('BTC')
              ? 1500.0
              : symbol.includes('ETH')
              ? 60.0
              : symbol.includes('SOL')
              ? 3.5
              : symbol.includes('JPY')
              ? 0.35
              : symbol === 'XAUUSD'
              ? 25.0
              : symbol === 'WTI' || symbol === 'BRENT'
              ? 1.5
              : 0.0030;
            const sl =
              direction === 'BUY'
                ? Math.round((currentPrice - pipFactor) * 100000) / 100000
                : Math.round((currentPrice + pipFactor) * 100000) / 100000;
            const tp =
              direction === 'BUY'
                ? Math.round((currentPrice + pipFactor * 2) * 100000) / 100000
                : Math.round((currentPrice - pipFactor * 2) * 100000) / 100000;
            setStopLoss(sl);
            setTakeProfit(tp);
          }
        }
      } catch (e) {
        console.error('Failed to fetch quote in ticket:', e);
      }
    }

    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [symbol, isOpen, direction, activeBroker.id]);

  // Automatically recalculate quantity (units/lots) from Risk % of Live Broker Equity whenever inputs change
  const riskMetrics = calculateRiskBasedOrderMetrics(
    symbol,
    activeBroker.id,
    liveEquity,
    riskPct,
    entryPrice,
    stopLoss,
    takeProfit
  );

  useEffect(() => {
    if (isOpen && entryPrice > 0 && stopLoss > 0) {
      setUnits(riskMetrics.units);
    }
  }, [isOpen, symbol, activeBroker.id, liveEquity, riskPct, entryPrice, stopLoss, riskMetrics.units]);

  const handleDirectionChange = (newDir: 'BUY' | 'SELL') => {
    if (newDir === direction) return;
    setDirection(newDir);
    setErrorMsg(null);
    if (entryPrice > 0 && stopLoss > 0 && takeProfit > 0) {
      const slDist = Math.abs(entryPrice - stopLoss);
      const tpDist = Math.abs(takeProfit - entryPrice);
      const def = getInstrumentDefinition(symbol);
      const digits = def?.digits || 5;
      if (newDir === 'BUY') {
        setStopLoss(Number((entryPrice - slDist).toFixed(digits)));
        setTakeProfit(Number((entryPrice + tpDist).toFixed(digits)));
      } else {
        setStopLoss(Number((entryPrice + slDist).toFixed(digits)));
        setTakeProfit(Number((entryPrice - tpDist).toFixed(digits)));
      }
    }
  };

  if (!isOpen) return null;

  const isDirectionValid =
    direction === 'BUY'
      ? entryPrice > 0 && stopLoss < entryPrice && takeProfit > entryPrice
      : entryPrice > 0 && stopLoss > entryPrice && takeProfit < entryPrice;

  const riskDist = direction === 'BUY' ? entryPrice - stopLoss : stopLoss - entryPrice;
  const rewardDist = direction === 'BUY' ? takeProfit - entryPrice : entryPrice - takeProfit;
  const calculatedRR = isDirectionValid && riskDist > 0 ? rewardDist / riskDist : 0;
  const isRRCompliant = isDirectionValid && calculatedRR >= 1.5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isDirectionValid) {
      setErrorMsg(
        direction === 'BUY'
          ? 'Invalid order structure: For BUY orders, Stop Loss must be strictly below Entry and Take Profit above Entry.'
          : 'Invalid order structure: For SELL orders, Stop Loss must be strictly above Entry and Take Profit below Entry.'
      );
      return;
    }

    if (units <= 0) {
      setErrorMsg('Volume / Units must be greater than zero.');
      return;
    }

    if (!isRRCompliant) {
      setErrorMsg(`Risk-Reward ratio is ${calculatedRR.toFixed(2)} (Minimum hurdle is 1.50). Adjust SL or TP.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const order: StandardizedOrderRequest = {
        brokerId: activeBroker.id,
        symbol,
        direction,
        orderType: 'MARKET',
        units: Number(units),
        riskPct: Number(riskPct),
        riskCapitalUsd: riskMetrics.riskCapitalUsd,
        entryPrice: Number(entryPrice),
        stopLoss: Number(stopLoss),
        takeProfit1: Number(takeProfit),
        riskReward: Math.round(calculatedRR * 100) / 100,
        clientOrderId: `manual-${Date.now()}`,
        source: 'MANUAL_TICKET',
      };

      await onSubmitOrder(order);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Order dispatch failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
              Risk-Sized Broker Order Ticket
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Target Broker & Live Equity Readout */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{activeBroker.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                  activeBroker.environment === 'LIVE'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {activeBroker.environment}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 mr-1.5">EQUITY:</span>
              <span className="text-emerald-400 font-bold tabular-nums">
                ${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Symbol & Direction Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 uppercase">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 px-2.5 py-2 rounded text-slate-200 font-bold focus:outline-none focus:border-cyan-500/50"
              >
                {WATCHLIST.map((w) => (
                  <option key={w.symbol} value={w.symbol}>
                    {w.symbol} ({w.assetClass})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 uppercase">Direction</label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDirectionChange('BUY')}
                  className={`py-1 rounded font-bold transition-colors cursor-pointer text-center ${
                    direction === 'BUY'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectionChange('SELL')}
                  className={`py-1 rounded font-bold transition-colors cursor-pointer text-center ${
                    direction === 'SELL'
                      ? 'bg-rose-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>
          </div>

          {/* Matched Broker Ticker Epic Callout */}
          <div className="bg-cyan-950/30 border border-cyan-800/40 p-2 rounded flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Tag className="w-3.5 h-3.5" />
              <span>Broker Epic:</span>
              <span className="font-bold font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700/60">
                {brokerEpic}
              </span>
            </div>
            {liveBid !== null && liveAsk !== null && (
              <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                Bid: <span className="text-slate-200">{liveBid}</span> | Ask: <span className="text-slate-200">{liveAsk}</span>
              </div>
            )}
          </div>

          {/* Risk Percentage of Equity Selector */}
          <div className="bg-slate-950/90 border border-cyan-900/50 rounded p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-300 font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Risk % of Capital
              </span>
              <span className="text-[11px] font-bold text-amber-300 tabular-nums">
                Risk Capital: ${riskMetrics.riskCapitalUsd.toFixed(2)} ({riskPct}% of ${liveEquity.toLocaleString()})
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {RISK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRiskPct(preset)}
                  className={`py-1 rounded font-bold text-[11px] border transition-colors cursor-pointer ${
                    riskPct === preset
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={riskPct}
                onChange={(e) => setRiskPct(Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 1.0)))}
                className="bg-slate-900 border border-slate-700 px-1.5 py-1 rounded text-center text-cyan-300 font-bold tabular-nums focus:outline-none focus:border-cyan-500"
                title="Custom Risk %"
              />
            </div>
          </div>

          {/* Entry Price & Auto-Calculated Risk Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 uppercase">
                Entry Price (Live)
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 font-bold tabular-nums focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-cyan-300 block mb-1 uppercase font-semibold">
                Risk-Sized Qty (Min: {brokerDetails.minLot})
              </label>
              <input
                type="number"
                step="any"
                value={units}
                onChange={(e) => setUnits(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-cyan-800/70 px-3 py-2 rounded text-cyan-300 font-bold tabular-nums focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-rose-400 block mb-1 uppercase">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-rose-300 font-bold tabular-nums focus:outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-emerald-400 block mb-1 uppercase">Take Profit</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-emerald-300 font-bold tabular-nums focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Risk-Reward & Effective Risk Telemetry Badge */}
          <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Order Validation &amp; R:R:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-black tabular-nums text-sm ${
                    isRRCompliant ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isDirectionValid ? `1 : ${calculatedRR.toFixed(2)}` : 'INVALID ORIENTATION'}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    isRRCompliant
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {isRRCompliant
                    ? 'APPROVED (>=1.5)'
                    : !isDirectionValid
                    ? direction === 'BUY'
                      ? 'SL MUST BE < ENTRY'
                      : 'SL MUST BE > ENTRY'
                    : 'BELOW 1.5 GATE'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
              <span>Effective SL Risk:</span>
              <span className="text-slate-200 font-bold tabular-nums">
                ${riskMetrics.effectiveRiskUsd.toFixed(2)} ({riskMetrics.effectiveRiskPct}% of Equity)
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !isRRCompliant}
              className={`w-full py-2.5 rounded font-bold text-slate-950 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                direction === 'BUY'
                  ? 'bg-emerald-400 hover:bg-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-rose-400 hover:bg-rose-300 shadow-sm shadow-rose-500/20'
              } disabled:opacity-50`}
            >
              <Send className="w-3.5 h-3.5 fill-current" />
              <span>
                {isSubmitting
                  ? 'DISPATCHING TO BROKER...'
                  : `EXECUTE ${direction} (${units} UNITS @ ${riskPct}% RISK)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

