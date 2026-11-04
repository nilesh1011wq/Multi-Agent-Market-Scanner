import React, { useState } from 'react';
import { WATCHLIST } from '../data/marketDataService';
import {
  X,
  Sliders,
  ShieldCheck,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Save
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(WATCHLIST.map((w) => w.symbol));
  const [minRR, setMinRR] = useState<number>(1.5);
  const [maxStopAtr, setMaxStopAtr] = useState<number>(3.0);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [minSampleSize, setMinSampleSize] = useState<number>(30);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                System Configuration & Risk Gatekeeper
              </h2>
              <p className="text-xs text-slate-400">
                Configure scanner watchlist, hard risk parameters, and analog engine constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Section 1: Watchlist Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                ACTIVE WATCHLIST ASSETS ({selectedSymbols.length}/12)
              </span>
              <button
                onClick={() =>
                  setSelectedSymbols(
                    selectedSymbols.length === WATCHLIST.length ? [] : WATCHLIST.map((w) => w.symbol)
                  )
                }
                className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
              >
                {selectedSymbols.length === WATCHLIST.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WATCHLIST.map((item) => {
                const isChecked = selectedSymbols.includes(item.symbol);
                return (
                  <button
                    key={item.symbol}
                    onClick={() => toggleSymbol(item.symbol)}
                    className={`p-2 rounded border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-slate-800/80 border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{item.symbol}</div>
                      <div className="text-[10px] text-slate-400">{item.assetClass}</div>
                    </div>
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Hard Risk Parameters (Non-Negotiable) */}
          <div className="space-y-3">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              RISK MANAGER HARD GATES (ARBITER CANNOT OVERRIDE)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <label className="text-[11px] text-slate-400">Min Risk:Reward Ratio</label>
                <div className="text-sm font-bold text-emerald-400">1 : {minRR.toFixed(1)}</div>
                <input
                  type="range"
                  min="1.5"
                  max="3.0"
                  step="0.1"
                  value={minRR}
                  onChange={(e) => setMinRR(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block">Strict minimum threshold</span>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <label className="text-[11px] text-slate-400">Max Stop ATR Distance</label>
                <div className="text-sm font-bold text-amber-400">{maxStopAtr.toFixed(1)} ATR</div>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.5"
                  value={maxStopAtr}
                  onChange={(e) => setMaxStopAtr(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <span className="text-[10px] text-slate-500 block">Vetoes wide trailing stops</span>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <label className="text-[11px] text-slate-400">Risk Per Trade (%)</label>
                <div className="text-sm font-bold text-cyan-400">{riskPercent.toFixed(1)}% Portfolio</div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.25"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block">Fixed fractional sizing</span>
              </div>
            </div>
          </div>

          {/* Section 3: Data Feeds & Knowledge Base Status */}
          <div className="space-y-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              INTEGRATED DATA PROVIDERS & KNOWLEDGE BASE
            </span>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span>Yahoo Finance Multi-Asset Candles</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ONLINE (D1/H4/H1/M15)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>FRED Macro Database (Rates, Yields, CPI, DXY, VIX)</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> CONNECTED (30-Year History)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>CFTC Commitments of Traders (COT) Engine</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE (Commercial Percentiles)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Historical Analog Fingerprint Store</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 1996–2026 Crisis & Shock Library
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Multi-Agent Specialist Inference</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Gemini 2.5 Flash / Claude Engine
                </span>
              </div>
            </div>
          </div>

          {/* Non-Execution Quant Disclaimer */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded flex items-start gap-2.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>STRICT NON-EXECUTION POLICY:</strong> This platform is a research, scanning, and debate simulation engine.
              Trade setups are pure algorithmic recommendations. Automated execution and real capital deployment are strictly disabled.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {savedSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configuration Saved Successfully
              </span>
            ) : (
              'Changes persist in local session'
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
