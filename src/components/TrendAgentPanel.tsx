import React from 'react';
import { BaseAgentOutput } from '../types/debate';
import { TrendingUp, AlertTriangle, ShieldCheck, CheckCircle2, Compass, Zap, HelpCircle } from 'lucide-react';

interface TrendAgentPanelProps {
  output: BaseAgentOutput | null;
  isRunning: boolean;
  onRunAgent: () => void;
  durationMs?: number;
}

export const TrendAgentPanel: React.FC<TrendAgentPanelProps> = ({
  output,
  isRunning,
  onRunAgent,
  durationMs,
}) => {
  return (
    <div className="bg-[#0b0f19] border-t border-slate-800 p-4 font-mono text-xs space-y-3.5">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 uppercase">
            Phase 2 Agent: Trend & Momentum Specialist (Single Timeframe)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {durationMs !== undefined && (
            <span className="text-[11px] text-slate-500 tabular-nums">
              LATENCY: {durationMs}ms
            </span>
          )}

          <button
            onClick={onRunAgent}
            disabled={isRunning}
            className="px-3 py-1 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold rounded text-[11px] transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>{isRunning ? 'EVALUATING...' : 'ANALYZE WITH AGENT 1'}</span>
          </button>
        </div>
      </div>

      {/* Output Presentation */}
      {output ? (
        <div className="space-y-3">
          {/* Top Verdict Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/80 p-3 rounded border border-slate-800/90">
            {/* Direction */}
            <div>
              <div className="text-[10px] text-slate-500">DIRECTION VERDICT</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-base font-bold px-2 py-0.5 rounded text-xs ${
                    output.direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : output.direction === 'SELL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {output.direction}
                </span>
              </div>
            </div>

            {/* Confidence */}
            <div>
              <div className="text-[10px] text-slate-500">CONFIDENCE CALIBRATION</div>
              <div className="text-base font-bold text-slate-100 mt-0.5 tabular-nums">
                {output.confidence} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
            </div>

            {/* Invalidation Level */}
            <div>
              <div className="text-[10px] text-slate-500">INVALIDATION LEVEL</div>
              <div className="text-base font-bold text-rose-400 mt-0.5 tabular-nums">
                {output.invalidation_level}
              </div>
            </div>

            {/* Timeframe Bias Strip */}
            <div>
              <div className="text-[10px] text-slate-500">MULTI-TIMEFRAME BIAS</div>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold">
                {Object.entries(output.timeframe_bias).map(([tf, bias]) => (
                  <span
                    key={tf}
                    className={`px-1 rounded ${
                      bias === 'BULLISH'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : bias === 'BEARISH'
                        ? 'text-rose-400 bg-rose-500/10'
                        : 'text-slate-400 bg-slate-800'
                    }`}
                  >
                    {tf}:{bias[0]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Reasoning Prose */}
          <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1.5">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
              <span>AGENT REASONING (MAX 120 WORDS · CITING SPECIFIC NUMBERS)</span>
              <span className="text-[10px] text-slate-500">DISCIPLINE ENFORCED</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              {output.reasoning}
            </p>
          </div>

          {/* Evidence Citations */}
          <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>EVIDENCE CITATIONS (NO HALLUCINATIONS · STRICT SAMPLE SIZE)</span>
              </div>
              <span className="text-[10px] text-slate-500">{output.evidence.length} claims</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {output.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 p-2.5 rounded border border-slate-800/80 space-y-1 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-semibold uppercase text-[10px]">
                      Source: {ev.source}
                    </span>
                    {ev.sample_size !== null ? (
                      <span className="text-emerald-400 font-semibold text-[10px]">
                        N = {ev.sample_size} (Sample Size)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Live Snapshot</span>
                    )}
                  </div>
                  <div className="text-slate-300">{ev.claim}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Levels, Risks & Data Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Key Levels */}
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-semibold">KEY S/R LEVELS</div>
              <div className="text-[11px] text-slate-300 tabular-nums space-y-0.5">
                <div>Support: {output.key_levels.support.slice(0, 3).map((v) => v.toFixed(4)).join(', ')}</div>
                <div>Resistance: {output.key_levels.resistance.slice(0, 3).map((v) => v.toFixed(4)).join(', ')}</div>
              </div>
            </div>

            {/* Identified Risks */}
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>IDENTIFIED RISKS</span>
              </div>
              <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                {output.risks.map((r, i) => (
                  <li key={i} className="truncate">{r}</li>
                ))}
              </ul>
            </div>

            {/* Data Gaps */}
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                <span>NOTED DATA GAPS</span>
              </div>
              <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                {output.data_gaps.map((g, i) => (
                  <li key={i} className="truncate">{g}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 p-6 rounded border border-slate-800/60 text-center space-y-2">
          <div className="text-slate-400 text-xs">
            Agent 1 (Trend & Momentum) is primed with the live Feature Snapshot, 30-Year Analogs, and Curated Knowledge Base.
          </div>
          <button
            onClick={onRunAgent}
            disabled={isRunning}
            className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded text-xs transition-colors inline-flex items-center gap-2 shadow-md shadow-cyan-500/10"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'EVALUATING SYMBOL...' : 'RUN AGENT 1 ANALYSIS'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
