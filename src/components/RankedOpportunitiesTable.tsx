import React, { useState } from 'react';
import { RankedOpportunity } from '../types/scanner';
import { Timeframe } from '../types/market';
import {
  TrendingUp,
  TrendingDown,
  MinusCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Flame,
  CheckCircle2,
  XCircle,
  PlayCircle
} from 'lucide-react';

interface RankedOpportunitiesTableProps {
  opportunities: RankedOpportunity[];
  isLoading: boolean;
  onRefreshScan: () => void;
  onSelectOpportunity: (symbol: string, timeframe: Timeframe) => void;
  onOpenPaperTrade: (opp: RankedOpportunity) => void;
  activeSymbol: string;
}

export function RankedOpportunitiesTable({
  opportunities,
  isLoading,
  onRefreshScan,
  onSelectOpportunity,
  onOpenPaperTrade,
  activeSymbol,
}: RankedOpportunitiesTableProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'BUY' | 'SELL' | 'HIGH_CONVICTION' | 'GATED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOpps = opportunities.filter((opp) => {
    if (searchQuery && !opp.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterMode === 'BUY') return opp.direction === 'BUY';
    if (filterMode === 'SELL') return opp.direction === 'SELL';
    if (filterMode === 'HIGH_CONVICTION') return opp.convictionScore >= 80 && opp.direction !== 'NO_TRADE';
    if (filterMode === 'GATED') return opp.direction === 'NO_TRADE' || opp.riskManagerApproval === 'VETO' || !opp.preFilterPassed;
    return true;
  });

  return (
    <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Flame className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Multi-Asset Opportunity Scanner
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20">
                12 Watchlist Assets · 5 Timeframes
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Deterministic pre-filter + 10-Agent Chamber consensus & Chief Arbiter recommendations
            </p>
          </div>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50 w-36"
            />
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 text-xs font-mono">
            {(['ALL', 'HIGH_CONVICTION', 'BUY', 'SELL', 'GATED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterMode(tab)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterMode === tab
                    ? 'bg-slate-800 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'HIGH_CONVICTION' ? '🔥 HIGH CONVICTION' : tab}
              </button>
            ))}
          </div>

          <button
            onClick={onRefreshScan}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Scanning...' : 'Rescan Watchlist'}</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 font-semibold">Rank</th>
              <th className="py-2.5 px-3 font-semibold">Asset / TF</th>
              <th className="py-2.5 px-3 font-semibold">Recommendation</th>
              <th className="py-2.5 px-3 font-semibold">Conviction</th>
              <th className="py-2.5 px-3 font-semibold">Entry Zone</th>
              <th className="py-2.5 px-3 font-semibold">Stop Loss</th>
              <th className="py-2.5 px-3 font-semibold">Targets (TP1 / TP2)</th>
              <th className="py-2.5 px-3 font-semibold">R:R Ratio</th>
              <th className="py-2.5 px-3 font-semibold">Chamber Vote</th>
              <th className="py-2.5 px-3 font-semibold">Evidence Badge</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredOpps.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  No opportunities match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredOpps.map((opp, idx) => {
                const isSelected = opp.symbol === activeSymbol;
                const isBuy = opp.direction === 'BUY';
                const isSell = opp.direction === 'SELL';
                const isNoTrade = opp.direction === 'NO_TRADE';

                return (
                  <tr
                    key={opp.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 text-slate-500 font-bold tabular-nums">
                      #{idx + 1}
                    </td>

                    {/* Symbol / TF */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectOpportunity(opp.symbol, opp.timeframe)}
                          className="font-bold text-slate-200 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                        >
                          {opp.symbol}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({opp.timeframe})
                          </span>
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                        {opp.regime}
                      </div>
                    </td>

                    {/* Direction */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          isBuy
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isSell
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isBuy && <TrendingUp className="w-3 h-3" />}
                        {isSell && <TrendingDown className="w-3 h-3" />}
                        {isNoTrade && <MinusCircle className="w-3 h-3" />}
                        {opp.direction}
                      </span>
                    </td>

                    {/* Conviction Score */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              opp.convictionScore >= 80
                                ? 'bg-cyan-400'
                                : opp.convictionScore >= 60
                                ? 'bg-emerald-400'
                                : 'bg-slate-500'
                            }`}
                            style={{ width: `${opp.convictionScore}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-200 tabular-nums">
                          {opp.convictionScore}
                        </span>
                        <span className="text-[10px] text-slate-500 tabular-nums">
                          ({opp.confidence}%)
                        </span>
                      </div>
                    </td>

                    {/* Entry Zone */}
                    <td className="py-3 px-3 text-slate-300 tabular-nums">
                      {isNoTrade
                        ? '—'
                        : `${opp.entryZone[0].toFixed(opp.symbol.includes('JPY') ? 2 : 4)} - ${opp.entryZone[1].toFixed(opp.symbol.includes('JPY') ? 2 : 4)}`}
                    </td>

                    {/* Stop Loss */}
                    <td className="py-3 px-3 text-rose-400 tabular-nums">
                      {isNoTrade ? '—' : opp.stopLoss.toFixed(opp.symbol.includes('JPY') ? 2 : 4)}
                    </td>

                    {/* Targets */}
                    <td className="py-3 px-3 text-emerald-400 tabular-nums">
                      {isNoTrade
                        ? '—'
                        : `${opp.takeProfits[0].toFixed(opp.symbol.includes('JPY') ? 2 : 4)} / ${opp.takeProfits[1].toFixed(opp.symbol.includes('JPY') ? 2 : 4)}`}
                    </td>

                    {/* R:R Ratio */}
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold tabular-nums ${
                          opp.riskReward >= 2.0
                            ? 'text-emerald-400'
                            : opp.riskReward >= 1.5
                            ? 'text-cyan-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isNoTrade ? '—' : `1:${opp.riskReward.toFixed(2)}`}
                      </span>
                    </td>

                    {/* Consensus Split */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-emerald-400 font-bold">{opp.consensus.buy}B</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-rose-400 font-bold">{opp.consensus.sell}S</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-400">{opp.consensus.neutral}N</span>
                      </div>
                    </td>

                    {/* Evidence Quality Badge */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            opp.evidenceBadge === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : opp.evidenceBadge === 'B'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          BADGE {opp.evidenceBadge}
                        </span>
                        {opp.riskManagerApproval === 'APPROVED' ? (
                          <span title="Risk Manager Approved">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        ) : opp.riskManagerApproval === 'VETO' ? (
                          <span title="Risk Manager Vetoed (Hard Gate)">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          </span>
                        ) : (
                          <span title="Size Reduced">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectOpportunity(opp.symbol, opp.timeframe)}
                          title="Load Chart & Debate Chamber"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Analyze
                        </button>
                        {opp.direction !== 'NO_TRADE' && opp.riskManagerApproval !== 'VETO' && (
                          <button
                            onClick={() => onOpenPaperTrade(opp)}
                            title="Open Virtual Paper Trade (1% Risk)"
                            className="px-2 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <PlayCircle className="w-3 h-3" />
                            <span>Paper</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pre-Filter Gating Explainer Bar */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">PRE-FILTER INTEGRITY:</span>
          <span className="text-slate-300">
            Pairs failing minimum ADX (16), volatility percentile (25%), or inside economic blackout are gated to conserve capital.
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>Badge A: N ≥ 30 + Regime Match</span>
          <span>·</span>
          <span>Badge B: N ≥ 30</span>
          <span>·</span>
          <span>Badge C: Evidence Gated</span>
        </div>
      </div>
    </div>
  );
}
