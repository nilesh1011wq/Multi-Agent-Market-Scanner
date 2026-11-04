import React, { useState } from 'react';
import { PaperPosition, PaperAccountSummary } from '../types/scanner';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  FastForward
} from 'lucide-react';

interface PaperTradingPanelProps {
  summary: PaperAccountSummary | null;
  openPositions: PaperPosition[];
  closedPositions: PaperPosition[];
  onSimulateTick: () => void;
  onClosePosition: (id: string, reason?: string) => void;
  isSimulating?: boolean;
}

export function PaperTradingPanel({
  summary,
  openPositions,
  closedPositions,
  onSimulateTick,
  onClosePosition,
  isSimulating = false,
}: PaperTradingPanelProps) {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED' | 'RULES'>('OPEN');

  const balance = summary ? summary.balance : 10000;
  const equity = summary ? summary.equity : 10000;
  const winRate = summary ? summary.winRate : 0;
  const totalR = summary ? summary.totalRealizedR : 0;
  const maxDDR = summary ? summary.maxDrawdownR : 0;

  return (
    <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Forward Paper-Trading Simulator & Bayesian Feedback Loop
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-mono border border-emerald-500/20">
                100% NON-EXECUTION · FORWARD TEST
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Resolutions automatically recalibrate specialist agent dynamic weights via Bayesian scoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSimulateTick}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <FastForward className={`w-3.5 h-3.5 ${isSimulating ? 'animate-pulse' : ''}`} />
            <span>{isSimulating ? 'Simulating Tick...' : 'Simulate Forward Tick (1 Bar)'}</span>
          </button>
        </div>
      </div>

      {/* Account KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-y md:divide-y-0 divide-slate-800/80 border-b border-slate-800 bg-slate-950/60 font-mono text-xs">
        <div className="p-3">
          <div className="text-[10px] text-slate-500 uppercase">Portfolio Equity</div>
          <div className="text-sm font-bold text-slate-100 tabular-nums">
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Starting: $10,000</div>
        </div>

        <div className="p-3">
          <div className="text-[10px] text-slate-500 uppercase">Realized PnL (R)</div>
          <div
            className={`text-sm font-bold tabular-nums ${
              totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalR >= 0 ? `+${totalR.toFixed(2)}R` : `${totalR.toFixed(2)}R`}
          </div>
          <div className="text-[10px] text-slate-500">
            {totalR >= 0 ? `+$${(totalR * 100).toFixed(0)}` : `-$${(Math.abs(totalR) * 100).toFixed(0)}`}
          </div>
        </div>

        <div className="p-3">
          <div className="text-[10px] text-slate-500 uppercase">Win Rate (OOS)</div>
          <div className="text-sm font-bold text-cyan-300 tabular-nums">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500">
            {closedPositions.filter((p) => p.realizedPnLR > 0).length}W /{' '}
            {closedPositions.filter((p) => p.realizedPnLR <= 0).length}L
          </div>
        </div>

        <div className="p-3">
          <div className="text-[10px] text-slate-500 uppercase">Max Drawdown</div>
          <div className="text-sm font-bold text-amber-400 tabular-nums">
            -{maxDDR.toFixed(2)}R
          </div>
          <div className="text-[10px] text-slate-500">Capped by 1% risk rule</div>
        </div>

        <div className="p-3">
          <div className="text-[10px] text-slate-500 uppercase">Active Trades</div>
          <div className="text-sm font-bold text-slate-200 tabular-nums">
            {openPositions.length} Open
          </div>
          <div className="text-[10px] text-slate-500">1% risk per position</div>
        </div>

        <div className="p-3">
          <div className="text-[10px] text-slate-500 uppercase">Bayesian Engine</div>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE LINKED
          </div>
          <div className="text-[10px] text-slate-500">Updates Agent Weights</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs font-mono">
        <button
          onClick={() => setActiveTab('OPEN')}
          className={`px-3 py-1 rounded transition-colors ${
            activeTab === 'OPEN'
              ? 'bg-slate-800 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Positions ({openPositions.length})
        </button>
        <button
          onClick={() => setActiveTab('CLOSED')}
          className={`px-3 py-1 rounded transition-colors ${
            activeTab === 'CLOSED'
              ? 'bg-slate-800 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Resolved Trades History ({closedPositions.length})
        </button>
        <button
          onClick={() => setActiveTab('RULES')}
          className={`px-3 py-1 rounded transition-colors ${
            activeTab === 'RULES'
              ? 'bg-slate-800 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Anti-Bias & Execution Rules
        </button>
      </div>

      {/* Open Positions Table */}
      {activeTab === 'OPEN' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-semibold">Position ID</th>
                <th className="py-2.5 px-3 font-semibold">Asset / TF</th>
                <th className="py-2.5 px-3 font-semibold">Direction</th>
                <th className="py-2.5 px-3 font-semibold">Entry Price</th>
                <th className="py-2.5 px-3 font-semibold">Current Price</th>
                <th className="py-2.5 px-3 font-semibold">Stop Loss</th>
                <th className="py-2.5 px-3 font-semibold">Take Profits</th>
                <th className="py-2.5 px-3 font-semibold">Unrealized PnL</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {openPositions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No open paper positions. Click "Paper" on any recommended opportunity above to open a position.
                  </td>
                </tr>
              ) : (
                openPositions.map((pos) => {
                  const isBuy = pos.direction === 'BUY';
                  const isPositive = pos.unrealizedPnLR >= 0;

                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-500 text-[10px]">
                        {pos.id.slice(0, 14)}...
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-200">
                        {pos.symbol} <span className="text-[10px] text-slate-500">({pos.timeframe})</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isBuy
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 tabular-nums">
                        {pos.entryPrice.toFixed(pos.symbol.includes('JPY') ? 2 : 4)}
                      </td>
                      <td className="py-3 px-3 text-slate-100 font-bold tabular-nums">
                        {pos.currentPrice.toFixed(pos.symbol.includes('JPY') ? 2 : 4)}
                      </td>
                      <td className="py-3 px-3 text-rose-400 tabular-nums">
                        {pos.stopLoss.toFixed(pos.symbol.includes('JPY') ? 2 : 4)}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 tabular-nums">
                        {pos.takeProfit1.toFixed(pos.symbol.includes('JPY') ? 2 : 4)} /{' '}
                        {pos.takeProfit2.toFixed(pos.symbol.includes('JPY') ? 2 : 4)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold tabular-nums ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? `+${pos.unrealizedPnLR.toFixed(2)}R` : `${pos.unrealizedPnLR.toFixed(2)}R`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.status === 'TP1_HIT'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {pos.status === 'TP1_HIT' ? 'TP1 HIT (BE STOP)' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onClosePosition(pos.id, 'MANUALLY_CLOSED')}
                          className="px-2 py-1 bg-slate-800 hover:bg-rose-900/40 text-rose-300 border border-slate-700 hover:border-rose-700/50 rounded text-[11px] transition-colors cursor-pointer"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Closed Positions Table */}
      {activeTab === 'CLOSED' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-semibold">Asset / TF</th>
                <th className="py-2.5 px-3 font-semibold">Direction</th>
                <th className="py-2.5 px-3 font-semibold">Entry / Exit</th>
                <th className="py-2.5 px-3 font-semibold">Realized PnL</th>
                <th className="py-2.5 px-3 font-semibold">Result</th>
                <th className="py-2.5 px-3 font-semibold">Evidence Badge</th>
                <th className="py-2.5 px-3 font-semibold">Bayesian Weight Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {closedPositions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No closed paper trades yet.
                  </td>
                </tr>
              ) : (
                closedPositions.map((pos) => {
                  const isWin = pos.realizedPnLR > 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-200">
                        {pos.symbol} <span className="text-[10px] text-slate-500">({pos.timeframe})</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 tabular-nums">
                        {pos.entryPrice.toFixed(pos.symbol.includes('JPY') ? 2 : 4)} →{' '}
                        {pos.exitPrice ? pos.exitPrice.toFixed(pos.symbol.includes('JPY') ? 2 : 4) : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold tabular-nums">
                        <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                          {isWin ? `+${pos.realizedPnLR.toFixed(2)}R` : `${pos.realizedPnLR.toFixed(2)}R`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isWin
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isWin ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {pos.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {pos.evidenceBadge}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        <span className="text-emerald-400 font-semibold">Dynamic weights updated:</span>{' '}
                        Agents who voted with winning direction gained credibility multiplier.
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Anti-Bias & Execution Rules Drawer */}
      {activeTab === 'RULES' && (
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 space-y-3 leading-relaxed">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>QUANTITATIVE ANTI-BIAS PROTOCOL & FORWARD VALIDATION</span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li>
              <strong className="text-slate-200">Strict Non-Execution:</strong> This system produces
              recommendations and simulates paper portfolios only. It never connects to real broker execution APIs.
            </li>
            <li>
              <strong className="text-slate-200">Anti-Lookahead Safeguard:</strong> Backtests strictly evaluate
              deterministic algorithmic signals. LLM agents are evaluated ONLY on forward-test paper trades,
              eliminating lookahead bias.
            </li>
            <li>
              <strong className="text-slate-200">Two-Target Scaling:</strong> At Target 1, 50% of position size is banked
              (+1.0R) and stop loss is moved to breakeven, guaranteeing risk-free runner towards Target 2.
            </li>
            <li>
              <strong className="text-slate-200">Bayesian Dynamic Recalibration:</strong> When a paper position closes,
              the outcome updates the live scorecards of the 10 specialist agents based on whether their debate votes
              aligned with the trade.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
