import React from 'react';
import { FeatureSnapshot } from '../types/market';
import { Cpu, CheckCircle2, AlertOctagon, TrendingUp, Compass, Activity, ArrowRight } from 'lucide-react';

interface FeatureSnapshotInspectorProps {
  snapshot: FeatureSnapshot | null;
}

export const FeatureSnapshotInspector: React.FC<FeatureSnapshotInspectorProps> = ({ snapshot }) => {
  if (!snapshot) {
    return (
      <div className="p-4 text-center text-xs text-slate-500 font-mono">
        Loading deterministic feature snapshot...
      </div>
    );
  }

  const { indicators } = snapshot;

  return (
    <div className="p-4 space-y-4 font-mono text-xs text-slate-300">
      {/* Title & Tradability Gate Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 uppercase">
            Feature Snapshot (Deterministic Code · No LLM)
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
            indicators.tradable
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {indicators.tradable ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>MARKET TRADABLE</span>
            </>
          ) : (
            <>
              <AlertOctagon className="w-3 h-3" />
              <span>MARKET UNTRADABLE (VETO GATE)</span>
            </>
          )}
        </div>
      </div>

      {/* Grid of Indicator Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Module 1: Trend & Momentum Stack */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>TREND & MOMENTUM</span>
            <span
              className={
                indicators.emaStack === 'BULLISH'
                  ? 'text-emerald-400'
                  : indicators.emaStack === 'BEARISH'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }
            >
              {indicators.emaStack}
            </span>
          </div>
          <div className="space-y-1 text-slate-300 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">EMA 20:</span>
              <span className="text-slate-200">{indicators.ema20}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">EMA 50:</span>
              <span className="text-slate-200">{indicators.ema50}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">EMA 200:</span>
              <span className="text-slate-200">{indicators.ema200}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dist to EMA20:</span>
              <span className="text-slate-200">{indicators.distEma20InAtr} ATR</span>
            </div>
            <div className="flex justify-between border-t border-slate-800/60 pt-1">
              <span className="text-slate-500">ADX (14):</span>
              <span className={indicators.adx14 >= 25 ? 'text-emerald-400' : 'text-slate-400'}>
                {indicators.adx14} ({indicators.adx14 >= 25 ? 'Trending' : 'Weak/Range'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">RSI (14):</span>
              <span
                className={
                  indicators.rsi14 >= 70
                    ? 'text-rose-400 font-bold'
                    : indicators.rsi14 <= 30
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-200'
                }
              >
                {indicators.rsi14}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stoch %K / %D:</span>
              <span>
                {indicators.stochK} / {indicators.stochD}
              </span>
            </div>
          </div>
        </div>

        {/* Module 2: Market Structure & Swings */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>MARKET STRUCTURE</span>
            <span
              className={
                indicators.swingStructure.structure === 'BULLISH'
                  ? 'text-emerald-400'
                  : indicators.swingStructure.structure === 'BEARISH'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }
            >
              {indicators.swingStructure.structure}
            </span>
          </div>
          <div className="space-y-1 text-slate-300 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">Last Swing High:</span>
              <span className="text-slate-200">{indicators.swingStructure.lastSwingHigh}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Swing Low:</span>
              <span className="text-slate-200">{indicators.swingStructure.lastSwingLow}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">BOS (Break of Structure):</span>
              <span className={indicators.swingStructure.bos ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                {indicators.swingStructure.bos ? 'YES (Active)' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CHoCH (Character Change):</span>
              <span className={indicators.swingStructure.choch ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                {indicators.swingStructure.choch ? 'YES (Potential Reversal)' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-800/60 pt-1">
              <span className="text-slate-500">Liquidity Sweep:</span>
              <span className={indicators.swingStructure.liquiditySweep ? 'text-rose-400' : 'text-slate-500'}>
                {indicators.swingStructure.liquiditySweep ?? 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Candle Pattern:</span>
              <span className="text-slate-200">
                {indicators.patterns.bullishEngulfing
                  ? 'Bullish Engulfing'
                  : indicators.patterns.bearishEngulfing
                  ? 'Bearish Engulfing'
                  : indicators.patterns.pinBar
                  ? `Pin Bar (${indicators.patterns.pinBar})`
                  : indicators.patterns.insideBar
                  ? 'Inside Bar'
                  : indicators.patterns.doji
                  ? 'Doji'
                  : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Module 3: Volatility & Regime */}
        <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>VOLATILITY & REGIME</span>
            <span className="text-cyan-300 uppercase">{indicators.regime}</span>
          </div>
          <div className="space-y-1 text-slate-300 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">ATR (14):</span>
              <span className="text-slate-200">{indicators.atr14}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ATR Percentile (1Y):</span>
              <span className="text-slate-200">{indicators.volatilityPercentile1Y}th</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bollinger Upper:</span>
              <span className="text-slate-200">{indicators.bollingerBands.upper}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bollinger Lower:</span>
              <span className="text-slate-200">{indicators.bollingerBands.lower}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bollinger Bandwidth:</span>
              <span className="text-slate-200">
                {(indicators.bollingerBands.bandwidth * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-800/60 pt-1">
              <span className="text-slate-500">S/R Clusters Found:</span>
              <span className="text-cyan-300">{indicators.srClusters.length} zones</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
