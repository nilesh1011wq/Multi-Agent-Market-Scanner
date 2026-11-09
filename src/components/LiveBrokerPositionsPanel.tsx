import React, { useState, useEffect, useMemo } from 'react';
import {
  BrokerAccountSummary,
  BrokerClosedPosition,
  BrokerConfig,
  BrokerPosition,
} from '../types/broker';
import { ExecutionAuditLog } from '../broker/brokerManager';
import {
  ALL_INSTRUMENTS,
  InstrumentDefinition,
  getBrokerSymbol,
  getTerminalSymbolFromBroker,
} from '../broker/symbolMapper';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Zap,
  Lock,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sliders,
  Tag,
  Radio,
  ExternalLink,
  Power,
  Trash2,
} from 'lucide-react';

interface LiveBrokerPositionsPanelProps {
  activeBroker: BrokerConfig;
  accountSummary: BrokerAccountSummary | null;
  positions: BrokerPosition[];
  closedPositions?: BrokerClosedPosition[];
  auditLogs: ExecutionAuditLog[];
  isLoading: boolean;
  onRefresh: () => void;
  onClosePosition: (ticketId: string) => Promise<void>;
  onMoveToBreakeven?: (ticketId: string) => Promise<void>;
  onCloseDuplicates?: () => Promise<void>;
  onFlattenAll: () => Promise<void>;
  onOpenBrokerSettings: () => void;
  onOpenManualTicket?: (symbol?: string) => void;
  onDisconnectBroker?: (brokerId: any) => Promise<any>;
}

export const LiveBrokerPositionsPanel: React.FC<LiveBrokerPositionsPanelProps> = ({
  activeBroker,
  accountSummary,
  positions,
  closedPositions = [],
  auditLogs,
  isLoading,
  onRefresh,
  onClosePosition,
  onMoveToBreakeven,
  onCloseDuplicates,
  onFlattenAll,
  onOpenBrokerSettings,
  onOpenManualTicket,
  onDisconnectBroker,
}) => {
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
  const [beTicketId, setBeTicketId] = useState<string | null>(null);
  const [isFlattening, setIsFlattening] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [confirmFlatten, setConfirmFlatten] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [symbolFilter, setSymbolFilter] = useState('');

  // Group positions by canonical terminal symbol to detect duplicates
  const positionsBySymbol = useMemo(() => {
    const map = new Map<string, BrokerPosition[]>();
    for (const pos of positions) {
      const canonical = getTerminalSymbolFromBroker(pos.symbol, pos.brokerId);
      if (!map.has(canonical)) map.set(canonical, []);
      map.get(canonical)!.push(pos);
    }
    return map;
  }, [positions]);

  const duplicateGroups = useMemo(() => {
    const dups: { symbol: string; count: number; positions: BrokerPosition[] }[] = [];
    positionsBySymbol.forEach((posList, sym) => {
      if (posList.length > 1) {
        dups.push({ symbol: sym, count: posList.length, positions: posList });
      }
    });
    return dups;
  }, [positionsBySymbol]);

  const hasDuplicates = duplicateGroups.length > 0;
  const totalExtraDuplicates = duplicateGroups.reduce((acc, g) => acc + (g.count - 1), 0);

  const handleCleanDuplicates = async () => {
    setIsCleaningDuplicates(true);
    try {
      if (onCloseDuplicates) {
        await onCloseDuplicates();
      } else {
        const res = await fetch('/api/broker/close-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brokerId: activeBroker.id }),
        });
        await res.json();
        onRefresh();
      }
    } catch (e) {
      console.error('Failed to clean up duplicates:', e);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // Fetch real live quotes for the 15 assets table
  useEffect(() => {
    let isMounted = true;
    async function loadQuotes() {
      try {
        const res = await fetch('/api/quotes');
        const data = await res.json();
        if (data.success && data.quotes && isMounted) {
          setQuotes(data.quotes);
        }
      } catch (e) {
        console.error('Failed to load live quotes:', e);
      }
    }
    loadQuotes();
    const interval = setInterval(loadQuotes, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleClose = async (ticketId: string) => {
    setClosingTicketId(ticketId);
    try {
      await onClosePosition(ticketId);
    } finally {
      setClosingTicketId(null);
    }
  };

  const handleMoveToBreakeven = async (ticketId: string) => {
    if (!onMoveToBreakeven) return;
    setBeTicketId(ticketId);
    try {
      await onMoveToBreakeven(ticketId);
    } finally {
      setBeTicketId(null);
    }
  };


  const handleFlatten = async () => {
    if (!confirmFlatten) {
      setConfirmFlatten(true);
      setTimeout(() => setConfirmFlatten(false), 5000);
      return;
    }
    setIsFlattening(true);
    try {
      await onFlattenAll();
      setConfirmFlatten(false);
    } finally {
      setIsFlattening(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnectBroker) return;
    setIsDisconnecting(true);
    try {
      await onDisconnectBroker(activeBroker.id);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isLive = activeBroker.environment === 'LIVE';

  const filteredInstruments = ALL_INSTRUMENTS.filter(
    (inst) =>
      inst.terminalSymbol.toLowerCase().includes(symbolFilter.toLowerCase()) ||
      inst.name.toLowerCase().includes(symbolFilter.toLowerCase()) ||
      inst.brokers[activeBroker.id]?.epic.toLowerCase().includes(symbolFilter.toLowerCase())
  );

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Broker Account Header Strip */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base text-slate-100 tracking-tight">
                  {activeBroker.name}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isLive
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isLive ? '🔴 LIVE REAL CAPITAL' : '🟡 DEMO PRACTICE'}
                </span>
                {accountSummary?.isRealBrokerAccount ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE ACCOUNT SYNCED
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    SANDBOX (NOT LINKED)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>
                  Auto-Execution:{' '}
                  <span className={activeBroker.isAutoExecutionEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {activeBroker.isAutoExecutionEnabled ? 'ACTIVE (BUY/SELL ARBITER)' : 'PAUSED'}
                  </span>
                </span>
                <span>·</span>
                <button
                  onClick={onOpenBrokerSettings}
                  className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  Configure Credentials
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {onOpenManualTicket && (
              <button
                onClick={() => onOpenManualTicket()}
                className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-500/20"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>ORDER TICKET</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>SYNC BROKER</span>
            </button>

            {activeBroker.status === 'CONNECTED' && onDisconnectBroker && (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                title="Disconnect active broker session"
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" />
                <span>{isDisconnecting ? 'DISCONNECTING...' : 'DISCONNECT'}</span>
              </button>
            )}

            {positions.length > 0 && (
              <button
                onClick={handleFlatten}
                disabled={isFlattening}
                className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  confirmFlatten
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{confirmFlatten ? 'CONFIRM EMERGENCY FLATTEN ALL' : 'FLATTEN ALL'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sandbox Notice Banner if Real Broker Account is Not Linked */}
        {!accountSummary?.isRealBrokerAccount && (
          <div className="mt-3 bg-amber-950/40 border border-amber-700/60 p-3 rounded flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-amber-300">
                  Running in Local Simulation Sandbox (Real Capital.com Account Not Linked)
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5 font-sans leading-relaxed">
                  The terminal is currently simulating orders locally. To sync your 20 live open Capital.com positions and real account balance ($26,504 vs local sandbox), link your Capital.com Demo API key, email, and password.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenBrokerSettings}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded text-xs transition-colors shrink-0 cursor-pointer shadow-sm shadow-amber-500/20 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>LINK CAPITAL.COM DEMO</span>
            </button>
          </div>
        )}

        {/* Account Balances Grid (100% Synced with Active Broker) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-400 block uppercase">Balance</span>
              {accountSummary?.isRealBrokerAccount ? (
                <span className="text-[8px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE BROKER
                </span>
              ) : (
                <span className="text-[8px] font-semibold px-1 rounded bg-slate-800 text-slate-400">
                  SANDBOX
                </span>
              )}
            </div>
            <span className="font-bold text-slate-100 text-sm tabular-nums">
              ${accountSummary ? accountSummary.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (activeBroker.customStartingBalance || 15000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Equity</span>
            <span className="font-bold text-slate-100 text-sm tabular-nums">
              ${accountSummary ? accountSummary.equity.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (activeBroker.customStartingBalance || 15000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Unrealized P&amp;L</span>
            <span
              className={`font-bold text-sm tabular-nums ${
                (accountSummary?.unrealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(accountSummary?.unrealizedPnL || 0) >= 0 ? '+' : ''}$
              {accountSummary ? accountSummary.unrealizedPnL.toFixed(2) : '0.00'}
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Margin Used</span>
            <span className="font-bold text-slate-100 text-sm tabular-nums">
              ${accountSummary ? accountSummary.marginUsed.toFixed(2) : '0.00'}
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Free Margin</span>
            <span className="font-bold text-cyan-300 text-sm tabular-nums">
              ${accountSummary ? accountSummary.marginFree.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (activeBroker.customStartingBalance || 15000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Margin Level</span>
            <span className="font-bold text-slate-100 text-sm tabular-nums">
              {accountSummary && accountSummary.marginLevelPct > 0
                ? `${accountSummary.marginLevelPct.toFixed(1)}%`
                : '∞ SAFE'}
            </span>
          </div>
        </div>

        {/* Institutional Trader Risk & Performance Telemetry Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950/90 p-2.5 rounded border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Realized Closed P&amp;L</span>
              <span
                className={`font-bold text-xs tabular-nums ${
                  (accountSummary?.realizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(accountSummary?.realizedPnL || 0) >= 0 ? '+' : ''}$
                {(accountSummary?.realizedPnL || 0).toFixed(2)} ({(accountSummary?.realizedPnLR || 0) >= 0 ? '+' : ''}
                {(accountSummary?.realizedPnLR || 0).toFixed(2)}R)
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
              {closedPositions.length} Closed
            </span>
          </div>

          <div className="bg-slate-950/90 p-2.5 rounded border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Win Rate &amp; Profit Factor</span>
              <span className="font-bold text-xs text-cyan-300 tabular-nums">
                {accountSummary?.winRate ?? 0}% WR · PF {accountSummary?.profitFactor ?? 0}
              </span>
            </div>
            <TrendingUp className="w-4 h-4 text-cyan-400/70" />
          </div>

          <div className="bg-slate-950/90 p-2.5 rounded border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Open Portfolio Heat</span>
              <span
                className={`font-bold text-xs tabular-nums ${
                  (accountSummary?.portfolioHeatPct || 0) >= 2.5 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {accountSummary?.portfolioHeatPct ?? 0}% / {activeBroker.maxPortfolioHeatPct || 3.0}% Max
              </span>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400/70" />
          </div>

          <div className="bg-slate-950/90 p-2.5 rounded border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Daily Drawdown Guard</span>
              <span
                className={`font-bold text-xs tabular-nums ${
                  accountSummary?.isCircuitBreakerActive
                    ? 'text-rose-400'
                    : (accountSummary?.dailyDrawdownPct || 0) < 0
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {accountSummary?.dailyDrawdownPct ?? 0}% (Limit: -{activeBroker.maxDailyDrawdownPct || 3.0}%)
              </span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                accountSummary?.isCircuitBreakerActive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {accountSummary?.isCircuitBreakerActive ? 'HALTED' : 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* 15 Watchlist Assets - Multi-Broker Mapping & Real Live Price Reference */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wide">
              15 Watchlist Assets: Multi-Broker Tickers &amp; Real Live Price Feed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              placeholder="Search symbol / broker ticker..."
              className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-56"
            />
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE REAL PRICES
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase">
                <th className="p-2.5">Terminal Symbol</th>
                <th className="p-2.5">Asset Name</th>
                <th className="p-2.5 text-right">Live Price (Yahoo)</th>
                <th className="p-2.5 text-right">Spread</th>
                <th className="p-2.5">Capital.com Epic</th>
                <th className="p-2.5">MT5 Symbol</th>
                <th className="p-2.5">IG Markets Epic</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {filteredInstruments.map((inst) => {
                const q = quotes[inst.terminalSymbol];
                const livePrice = q?.price;
                const spread = q ? (q.ask - q.bid).toFixed(inst.digits) : '---';

                return (
                  <tr key={inst.terminalSymbol} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100">{inst.terminalSymbol}</span>
                        <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
                          {inst.assetClass === 'FOREX' ? 'FX' : inst.assetClass === 'COMMODITY' ? 'COMM' : 'CRYPTO'}
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-400">{inst.name}</td>
                    <td className="p-2.5 text-right font-bold tabular-nums text-slate-100">
                      {livePrice !== undefined ? livePrice.toFixed(inst.digits) : '---'}
                    </td>
                    <td className="p-2.5 text-right text-slate-400 tabular-nums">{spread}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          activeBroker.id === 'CAPITAL_COM'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {inst.brokers.CAPITAL_COM.epic}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          activeBroker.id === 'MT5'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {inst.brokers.MT5.epic}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          activeBroker.id === 'IG'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {inst.brokers.IG.epic}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      {onOpenManualTicket && (
                        <button
                          onClick={() => onOpenManualTicket(inst.terminalSymbol)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          TRADE
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wide">
              Active Broker Positions ({positions.length})
            </span>
            {hasDuplicates && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {totalExtraDuplicates} DUPLICATES
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasDuplicates && (
              <button
                onClick={handleCleanDuplicates}
                disabled={isCleaningDuplicates}
                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded text-[10px] transition-colors cursor-pointer shadow-sm shadow-rose-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isCleaningDuplicates ? 'CLEANING UP...' : 'CLEAN UP DUPLICATES'}</span>
              </button>
            )}
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Live positions synced 100% with {activeBroker.name} · Auto-Breakeven at +1.0R
            </span>
          </div>
        </div>

        {/* Duplicate Positions Alert & Clean Up Banner */}
        {hasDuplicates && (
          <div className="p-3 bg-rose-950/40 border-b border-rose-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-rose-200">
                    DUPLICATE TRADES DETECTED: 1 TRADE PER INSTRUMENT POLICY VIOLATED
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-500/30 text-rose-200 border border-rose-400/50">
                    {totalExtraDuplicates} EXTRA POSITION{totalExtraDuplicates > 1 ? 'S' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-rose-300/80 mt-0.5 font-sans leading-relaxed">
                  {duplicateGroups
                    .map((g) => `${g.symbol} (${g.count} open positions)`)
                    .join(' · ')}
                  . Institutional risk rules require strictly 1 trade per instrument across the entire portfolio.
                </p>
              </div>
            </div>
            <button
              onClick={handleCleanDuplicates}
              disabled={isCleaningDuplicates}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded text-xs transition-colors shrink-0 cursor-pointer shadow-sm shadow-rose-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isCleaningDuplicates ? 'CLOSING DUPLICATES...' : 'CLEAN UP DUPLICATES (KEEP 1 PER ASSET)'}</span>
            </button>
          </div>
        )}

        {positions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-1">
            <p className="font-semibold text-slate-400">No open positions on {activeBroker.name}</p>
            <p className="text-[11px]">
              Orders dispatched via Chief Arbiter, the manual order ticket, or directly inside your {activeBroker.name} account will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-500 uppercase">
                  <th className="p-2.5">Ticket ID</th>
                  <th className="p-2.5">Symbol</th>
                  <th className="p-2.5">Broker Epic</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5 text-right">Units / Vol</th>
                  <th className="p-2.5 text-right">Risk %</th>
                  <th className="p-2.5 text-right">Open Price</th>
                  <th className="p-2.5 text-right">Current Price</th>
                  <th className="p-2.5 text-right">SL</th>
                  <th className="p-2.5 text-right">TP</th>
                  <th className="p-2.5 text-right">PnL ($ / R)</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {positions.map((pos) => {
                  const isClosing = closingTicketId === pos.brokerTicketId;
                  const isMovingBe = beTicketId === pos.brokerTicketId;
                  const isBeLocked =
                    pos.isBreakevenLocked ||
                    (pos.stopLoss > 0 &&
                      ((pos.direction === 'BUY' && pos.stopLoss >= pos.openPrice) ||
                        (pos.direction === 'SELL' && pos.stopLoss <= pos.openPrice)));
                  const isDuplicateRow =
                    (positionsBySymbol.get(getTerminalSymbolFromBroker(pos.symbol, pos.brokerId))?.length || 0) > 1;

                  return (
                    <tr
                      key={pos.brokerTicketId}
                      className={`hover:bg-slate-900/30 transition-colors ${
                        isDuplicateRow ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      <td className="p-2.5 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span>{pos.brokerTicketId}</span>
                          {pos.brokerTicketId.startsWith('CAP-DEMO') || pos.brokerTicketId.startsWith('CAP-LIVE') ? (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              SANDBOX
                            </span>
                          ) : (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              LIVE BROKER
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 font-bold text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span>{pos.symbol}</span>
                          {isDuplicateRow && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40">
                              DUPLICATE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-cyan-300 font-semibold">{getBrokerSymbol(pos.symbol, pos.brokerId)}</td>
                      <td className="p-2.5 font-semibold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.direction === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-semibold tabular-nums text-slate-200">
                        {pos.units.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right tabular-nums">
                        {isBeLocked ? (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">
                            0% (BE LOCKED)
                          </span>
                        ) : (
                          <span className="text-amber-300 font-bold">{pos.riskPct ?? 1.0}%</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-slate-300">{pos.openPrice}</td>
                      <td className="p-2.5 text-right tabular-nums text-slate-100 font-bold">{pos.currentPrice}</td>
                      <td className="p-2.5 text-right text-rose-400 tabular-nums">{pos.stopLoss}</td>
                      <td className="p-2.5 text-right text-emerald-400 tabular-nums">{pos.takeProfit}</td>
                      <td className="p-2.5 text-right font-bold tabular-nums">
                        <span className={pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} (
                          {pos.unrealizedPnLR >= 0 ? '+' : ''}
                          {pos.unrealizedPnLR.toFixed(2)}R)
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onMoveToBreakeven && !isBeLocked && (
                            <button
                              onClick={() => handleMoveToBreakeven(pos.brokerTicketId)}
                              disabled={isMovingBe}
                              title="Lock Stop Loss at Breakeven (Open Price)"
                              className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-700/50 rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isMovingBe ? 'MOVING...' : 'MOVE SL TO BE'}
                            </button>
                          )}
                          <button
                            onClick={() => handleClose(pos.brokerTicketId)}
                            disabled={isClosing}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-300 rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isClosing ? 'CLOSING...' : 'CLOSE'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Positions / Trade History Table (Synced 100% with Active Broker) */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wide">
              Closed Positions &amp; Broker Trade History ({closedPositions.length})
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Realized outcomes automatically feed 10-Agent Bayesian Scorecards
          </span>
        </div>

        {closedPositions.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No closed trades in this session yet. Closed positions from {activeBroker.name} (SL/TP hits, manual closes, or broker history) will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-500 uppercase">
                  <th className="p-2.5">Closed At</th>
                  <th className="p-2.5">Ticket ID</th>
                  <th className="p-2.5">Symbol</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5 text-right">Units</th>
                  <th className="p-2.5 text-right">Risk %</th>
                  <th className="p-2.5 text-right">Entry</th>
                  <th className="p-2.5 text-right">Exit</th>
                  <th className="p-2.5 text-center">Reason</th>
                  <th className="p-2.5 text-right">Realized PnL ($ / R)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {closedPositions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/30">
                    <td className="p-2.5 text-slate-500">
                      {new Date(c.closedAt).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5 text-slate-400">{c.brokerTicketId}</td>
                    <td className="p-2.5 font-bold text-slate-100">{c.symbol}</td>
                    <td className="p-2.5 font-semibold">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.direction === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {c.direction}
                      </span>
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-slate-300">
                      {c.units.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-amber-300">
                      {c.riskPct}%
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-slate-400">{c.openPrice || '---'}</td>
                    <td className="p-2.5 text-right tabular-nums text-slate-200 font-semibold">{c.exitPrice || '---'}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          c.closeReason === 'TP_HIT'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : c.closeReason === 'SL_HIT'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {c.closeReason}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-bold tabular-nums">
                      <span className={c.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {c.realizedPnL >= 0 ? '+' : ''}${c.realizedPnL.toFixed(2)} (
                        {c.realizedPnLR >= 0 ? '+' : ''}
                        {c.realizedPnLR.toFixed(2)}R)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution Audit Log */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wide">
              Broker Execution Audit Trail ({auditLogs.length})
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Live order fills, risk %, &amp; rejection records</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-4 text-center text-slate-500">No broker trade executions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-500 uppercase">
                  <th className="p-2">Time</th>
                  <th className="p-2">Broker</th>
                  <th className="p-2">Symbol</th>
                  <th className="p-2">Side</th>
                  <th className="p-2 text-right">Units</th>
                  <th className="p-2 text-right">Risk %</th>
                  <th className="p-2 text-right">Fill Price</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-center">Source</th>
                  <th className="p-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/30">
                    <td className="p-2 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2 text-slate-400">{log.brokerId}</td>
                    <td className="p-2 font-bold text-slate-200">{log.symbol}</td>
                    <td className="p-2 font-semibold">
                      <span className={log.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                        {log.direction}
                      </span>
                    </td>
                    <td className="p-2 text-right text-slate-300 tabular-nums">{log.units}</td>
                    <td className="p-2 text-right text-amber-300 tabular-nums">{log.riskPct ?? 1.0}%</td>
                    <td className="p-2 text-right text-slate-200 tabular-nums">{log.entryPrice}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          log.status === 'FILLED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className="text-[10px] text-slate-400">{log.source}</span>
                    </td>
                    <td className="p-2 text-slate-400 text-[10px] truncate max-w-xs">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

