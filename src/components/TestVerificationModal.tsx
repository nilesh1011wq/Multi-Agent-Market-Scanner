import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Play, Terminal } from 'lucide-react';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTest: () => Promise<void>;
  isRunning: boolean;
  testPassed: boolean | null;
}

export const TestVerificationModal: React.FC<TestModalProps> = ({
  isOpen,
  onClose,
  onRunTest,
  isRunning,
  testPassed,
}) => {
  if (!isOpen) return null;

  const testList = [
    { id: 1, name: 'Candle Generator & Chronology', detail: 'Verifies chronological sort, High >= Low, and OHLC integrity.' },
    { id: 2, name: 'EMA & RSI Math', detail: 'Verifies Wilder RSI bounding [0,100] and EMA 20 initialization.' },
    { id: 3, name: 'MACD & Stochastic Oscillator', detail: 'Validates line/signal separation and 0-100 bounded stochastic oscillators.' },
    { id: 4, name: 'ATR & ADX Directional System', detail: 'Tests positive ATR values and ADX trending strength calibration.' },
    { id: 5, name: 'Bollinger Bands & Bandwidth', detail: 'Ensures Upper > Lower and calculates %B and bandwidth squeeze.' },
    { id: 6, name: 'Classical Pivots (R1 > PP > S1)', detail: 'Verifies standard floor pivot calculation and level hierarchy.' },
    { id: 7, name: 'Market Structure & Swings (BOS / CHoCH)', detail: 'Evaluates structural trend transitions, BOS continuation, and liquidity sweeps.' },
    { id: 8, name: '6-Factor Regime Classifier & Tradability Gate', detail: 'Enforces tradability gatekeeper rules for dead chop and extreme volatility.' },
    { id: 9, name: '30-Year Analog Engine & N >= 30 Enforcement', detail: 'Guarantees that insufficient sample sizes (<30) block agent statistical citations.' },
    { id: 10, name: 'COT 30-Year Percentiles & Per-Agent KB', detail: 'Confirms CFTC positioning calculation and per-agent document collections.' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c101a] border border-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-bold text-base text-slate-100">
              Quant Feature Engine Automated Test Suite
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test List */}
        <div className="p-4 overflow-y-auto space-y-2.5 font-mono text-xs">
          <div className="text-slate-400 pb-1">
            Running 10 rigorous quantitative tests on deterministic feature computation, analog fingerprint matching, and gatekeeper rules:
          </div>

          <div className="space-y-2">
            {testList.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80 flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {testPassed === true ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">
                      {t.id}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">{t.name}</div>
                  <div className="text-[11px] text-slate-500">{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">
            {testPassed === true ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                10/10 UNIT TESTS PASSED · ZERO ERRORS
              </span>
            ) : isRunning ? (
              <span className="text-cyan-400">Executing test suite in background...</span>
            ) : (
              <span>Ready to run automated verification suite</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRunTest}
              disabled={isRunning}
              className="px-4 py-2 text-xs font-mono font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'RUNNING...' : 'EXECUTE TESTS'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-slate-300 hover:text-white bg-slate-800 rounded transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
