import React from 'react';
import { AnalogStats, COTData } from '../types/market';
import { History, ShieldAlert, CheckCircle2, Calendar, Database, FileText } from 'lucide-react';

interface AnalogInspectorProps {
  analogs: AnalogStats | null;
  cot: COTData | null;
}

export const AnalogInspector: React.FC<AnalogInspectorProps> = ({ analogs, cot }) => {
  if (!analogs) {
    return (
      <div className="p-4 text-center text-xs text-slate-500 font-mono">
        Querying 30-year historical analog database...
      </div>
    );
  }

  const { situationFingerprint, isSufficientEvidence, sampleSize, hitRate, avgMoveInAtr, maxDrawdownInAtr, closestDates, regimeMatch, dataDepthYears } = analogs;

  return (
    <div className="p-4 space-y-4 font-mono text-xs text-slate-300">
      {/* Title & Evidence Quality Gate */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 uppercase">
            30-Year Historical Analog Engine (1996 - 2026)
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
            isSufficientEvidence
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          {isSufficientEvidence ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>SUFFICIENT EVIDENCE (N = {sampleSize} ≥ 30)</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3" />
              <span>INSUFFICIENT EVIDENCE (N = {sampleSize} &lt; 30) · NO CITATIONS</span>
            </>
          )}
        </div>
      </div>

      {/* Analog Statistics Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Metric 1: Sample Size & Depth */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>SAMPLE SIZE</span>
            <span className="text-cyan-400 font-bold">{dataDepthYears}Y DEPTH</span>
          </div>
          <div className="text-xl font-bold text-slate-100 tabular-nums">
            {sampleSize} <span className="text-xs font-normal text-slate-500">episodes</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Regime match: <span className="text-slate-300 capitalize">{regimeMatch}</span>
          </div>
        </div>

        {/* Metric 2: Historical Hit Rate */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
          <div className="text-[11px] text-slate-400">HISTORICAL HIT RATE</div>
          <div className="text-xl font-bold text-emerald-400 tabular-nums">
            {(hitRate * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500">
            Based on regime-matched analogs
          </div>
        </div>

        {/* Metric 3: Average Move */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
          <div className="text-[11px] text-slate-400">AVG MOVE IN ATR</div>
          <div className="text-xl font-bold text-cyan-300 tabular-nums">
            +{avgMoveInAtr} ATR
          </div>
          <div className="text-[10px] text-slate-500">
            Post-setup follow-through
          </div>
        </div>

        {/* Metric 4: Max Adverse Excursion (Drawdown) */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
          <div className="text-[11px] text-slate-400">WORST-CASE DRAWDOWN</div>
          <div className="text-xl font-bold text-rose-400 tabular-nums">
            -{maxDrawdownInAtr} ATR
          </div>
          <div className="text-[10px] text-slate-500">
            Maximum adverse excursion (MAE)
          </div>
        </div>
      </div>

      {/* Closest Historical Dates & COT Positioning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Closest Analogs */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>CLOSEST HISTORICAL ANALOG EPISODES</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {closestDates.map((date, idx) => (
              <span
                key={idx}
                className="bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700/80 text-[11px]"
              >
                {date}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 pt-1">
            Situation fingerprint: {situationFingerprint.regime} · {situationFingerprint.volatilityBucket} Vol · {situationFingerprint.momentumZone} Momentum · {situationFingerprint.emaAlignment} EMA
          </div>
        </div>

        {/* CFTC COT 30-Year Positioning */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>CFTC COMMITMENTS OF TRADERS (30Y PERCENTILES)</span>
            </div>
            {cot && (
              <span className="text-[10px] text-slate-500">Report: {cot.reportDate}</span>
            )}
          </div>

          {cot ? (
            <div className="space-y-1 text-slate-300 tabular-nums pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">30-Year Percentile:</span>
                <span
                  className={
                    cot.isExtremeLong
                      ? 'text-rose-400 font-bold'
                      : cot.isExtremeShort
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-200'
                  }
                >
                  {cot.percentile30Y.toFixed(1)}th percentile {cot.isExtremeLong ? '(Crowded Long Risk)' : cot.isExtremeShort ? '(Crowded Short Squeeze)' : '(Neutral)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Commercial (Hedgers) Net:</span>
                <span className="text-slate-200">{cot.commercialNet.toLocaleString()} contracts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Non-Commercial (Speculators) Net:</span>
                <span className="text-slate-200">{cot.nonCommercialNet.toLocaleString()} contracts</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-[11px]">Loading COT positioning...</div>
          )}
        </div>
      </div>
    </div>
  );
};
