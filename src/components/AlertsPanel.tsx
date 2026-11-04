import React, { useState } from 'react';
import { AlertConfig, DispatchedAlert } from '../types/scanner';
import {
  Bell,
  Send,
  Settings,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AlertsPanelProps {
  alerts: DispatchedAlert[];
  config: AlertConfig;
  onUpdateConfig: (newConfig: Partial<AlertConfig>) => void;
  onSendTestAlert: (symbol: string) => void;
  isSendingTest?: boolean;
}

export function AlertsPanel({
  alerts,
  config,
  onUpdateConfig,
  onSendTestAlert,
  isSendingTest = false,
}: AlertsPanelProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [webhookInput, setWebhookInput] = useState(config.webhookUrl);
  const [minConfInput, setMinConfInput] = useState(config.minConfidence);
  const [minRRInput, setMinRRInput] = useState(config.minRiskReward);
  const [blockEvents, setBlockEvents] = useState(config.blockOnEconomicEvent);
  const [testSymbol, setTestSymbol] = useState('EURUSD');

  const handleSaveConfig = () => {
    onUpdateConfig({
      webhookUrl: webhookInput,
      minConfidence: minConfInput,
      minRiskReward: minRRInput,
      blockOnEconomicEvent: blockEvents,
    });
    setShowConfig(false);
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Real-Time Trade Alerts & Webhooks
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-mono border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LISTENER ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Fires only when Confidence ≥ {config.minConfidence}%, R:R ≥ {config.minRiskReward}, & Evidence Badges [
              {config.allowedBadges.join(', ')}]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSendTestAlert(testSymbol)}
            disabled={isSendingTest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingTest ? 'Sending...' : 'Test Webhook'}</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
            {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Config Drawer */}
      {showConfig && (
        <div className="p-4 bg-slate-950 border-b border-slate-800 font-mono text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Min Confidence Gate (%)</label>
              <input
                type="number"
                min={50}
                max={95}
                value={minConfInput}
                onChange={(e) => setMinConfInput(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
              <span className="text-[10px] text-slate-500">Filters low conviction noise</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Min Risk-Reward Ratio</label>
              <input
                type="number"
                step="0.1"
                min={1.5}
                max={5.0}
                value={minRRInput}
                onChange={(e) => setMinRRInput(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
              <span className="text-[10px] text-slate-500">Strict 1:1.5 minimum quantifier</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Event Blackout Suppression</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="eventBlackout"
                  checked={blockEvents}
                  onChange={(e) => setBlockEvents(e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="eventBlackout" className="text-slate-300">
                  Silence alerts ±30m around High-Impact news
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Webhook Dispatch Endpoint (POST)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://discord.com/api/webhooks/... or https://api.telegram.org/..."
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
              <button
                onClick={handleSaveConfig}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatched Alerts History Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 font-semibold">Timestamp</th>
              <th className="py-2.5 px-3 font-semibold">Asset / TF</th>
              <th className="py-2.5 px-3 font-semibold">Direction</th>
              <th className="py-2.5 px-3 font-semibold">Confidence</th>
              <th className="py-2.5 px-3 font-semibold">Entry Zone</th>
              <th className="py-2.5 px-3 font-semibold">Stop Loss</th>
              <th className="py-2.5 px-3 font-semibold">Targets</th>
              <th className="py-2.5 px-3 font-semibold">R:R</th>
              <th className="py-2.5 px-3 font-semibold">Badge</th>
              <th className="py-2.5 px-3 font-semibold text-right">Delivery Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  No alerts have been dispatched yet.
                </td>
              </tr>
            ) : (
              alerts.map((al) => {
                const isBuy = al.direction === 'BUY';
                const timeStr = new Date(al.firedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr key={al.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">{timeStr}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {al.symbol} <span className="text-[10px] text-slate-500">({al.timeframe})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {al.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-bold tabular-nums">
                      {al.confidence}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 tabular-nums">
                      {al.entryZone[0].toFixed(al.symbol.includes('JPY') ? 2 : 4)} -{' '}
                      {al.entryZone[1].toFixed(al.symbol.includes('JPY') ? 2 : 4)}
                    </td>
                    <td className="py-2.5 px-3 text-rose-400 tabular-nums">
                      {al.stopLoss.toFixed(al.symbol.includes('JPY') ? 2 : 4)}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 tabular-nums">
                      {al.takeProfit1.toFixed(al.symbol.includes('JPY') ? 2 : 4)} /{' '}
                      {al.takeProfit2.toFixed(al.symbol.includes('JPY') ? 2 : 4)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400 tabular-nums">
                      1:{al.riskReward.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {al.evidenceBadge}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{al.statusMessage}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
