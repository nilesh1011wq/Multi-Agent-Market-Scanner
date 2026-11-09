import React, { useState, useEffect } from 'react';
import { BrokerConfig, BrokerId, BrokerEnvironment } from '../types/broker';
import { safeFetchJson } from '../utils/apiClient';
import {
  X,
  ShieldCheck,
  Zap,
  Globe,
  Lock,
  Key,
  Server,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Power,
  Activity,
  Layers,
} from 'lucide-react';

interface BrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: Record<BrokerId, BrokerConfig>;
  activeBrokerId: BrokerId;
  onSaveConfig: (brokerId: BrokerId, updated: Partial<BrokerConfig>) => Promise<void>;
  onConnectBroker: (brokerId: BrokerId) => Promise<{ success: boolean; latencyMs: number; message: string }>;
  onDisconnectBroker?: (brokerId: BrokerId) => Promise<any>;
  onSelectActiveBroker: (brokerId: BrokerId) => Promise<void>;
  onToggleAutoExecution: (enabled: boolean) => Promise<void>;
}

export const BrokerModal: React.FC<BrokerModalProps> = ({
  isOpen,
  onClose,
  configs,
  activeBrokerId,
  onSaveConfig,
  onConnectBroker,
  onDisconnectBroker,
  onSelectActiveBroker,
  onToggleAutoExecution,
}) => {
  const [selectedTab, setSelectedTab] = useState<BrokerId>('CAPITAL_COM');
  const [formData, setFormData] = useState<Record<BrokerId, Partial<BrokerConfig>>>({
    CAPITAL_COM: {},
    MT5: {},
    IG: {},
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingBalance, setIsSyncingBalance] = useState(false);
  const [syncBalanceResult, setSyncBalanceResult] = useState<{ success: boolean; message: string } | null>(null);

  // Keep form data synchronized with stored broker configurations so saved credentials are never wiped
  useEffect(() => {
    if (isOpen && configs) {
      setFormData({
        CAPITAL_COM: { ...configs.CAPITAL_COM },
        MT5: { ...configs.MT5 },
        IG: { ...configs.IG },
      });
    }
  }, [isOpen, configs]);

  if (!isOpen) return null;

  const currentBroker = configs[selectedTab];
  const activeForm = formData[selectedTab] || {};

  const handleFieldChange = (field: keyof BrokerConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [selectedTab]: {
        ...prev[selectedTab],
        [field]: value,
      },
    }));
  };

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // 1. Save config first
      const updates = formData[selectedTab] || {};
      await onSaveConfig(selectedTab, updates);

      // 2. Test connection
      const res = await onConnectBroker(selectedTab);
      setTestResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchBrokerBalance = async () => {
    setIsSyncingBalance(true);
    setSyncBalanceResult(null);
    try {
      // Ensure current changes are saved first
      const updates = formData[selectedTab] || {};
      await onSaveConfig(selectedTab, updates);

      const res = await safeFetchJson('/api/broker/sync-balance', { method: 'POST' });
      if (res.success && res.data?.summary) {
        const bal = res.data.summary.balance;
        const source = res.data.summary.isRealBrokerAccount ? 'Live Broker Account' : 'Calibrated Sandbox';
        setSyncBalanceResult({
          success: true,
          message: `Successfully fetched balance: $${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${res.data.summary.currency} (${source}).`,
        });
        handleFieldChange('customStartingBalance', bal);
      } else {
        setSyncBalanceResult({
          success: false,
          message: res.error || res.data?.error || 'Failed to sync balance from broker.',
        });
      }
    } catch (err: any) {
      setSyncBalanceResult({
        success: false,
        message: err.message || 'Failed to connect to broker balance service.',
      });
    } finally {
      setIsSyncingBalance(false);
    }
  };

  const handleMakeActive = async () => {
    await onSelectActiveBroker(selectedTab);
  };

  const handleDisconnect = async () => {
    if (!onDisconnectBroker) return;
    setIsDisconnecting(true);
    setTestResult(null);
    try {
      const res = await onDisconnectBroker(selectedTab);
      setTestResult({
        success: true,
        message: `${configs[selectedTab]?.name || 'Broker'} disconnected successfully.`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to disconnect broker.',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isCurrentActive = activeBrokerId === selectedTab;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl font-mono text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Multi-Broker Execution Gateway
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  AES-256 Encrypted Vault
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Connect Capital.com, MetaTrader 5 (MT5/MetaAPI), or IG Markets for Demo and Live order execution.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Broker Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
          {(['CAPITAL_COM', 'MT5', 'IG'] as BrokerId[]).map((id) => {
            const conf = configs[id];
            const isSelected = selectedTab === id;
            const isLive = (formData[id]?.environment ?? conf.environment) === 'LIVE';

            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedTab(id);
                  setTestResult(null);
                }}
                className={`flex-1 p-2.5 rounded border transition-all text-left flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-200">
                      {id === 'CAPITAL_COM' ? 'Capital.com' : id === 'MT5' ? 'MetaTrader 5' : 'IG Markets'}
                    </span>
                    {activeBrokerId === id && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isLive ? (
                      <span className="text-rose-400 font-semibold">🔴 LIVE CAPITAL</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">🟡 DEMO SANDBOX</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      conf.status === 'CONNECTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : conf.status === 'ERROR'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {conf.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Broker Configuration Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Active Broker Banner & Environment Switch */}
          <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-slate-200 font-bold flex items-center gap-2">
                <span>{currentBroker.name} Settings</span>
                {isCurrentActive ? (
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected for Order Execution
                  </span>
                ) : (
                  <button
                    onClick={handleMakeActive}
                    className="text-[10px] text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Set as Primary Execution Broker
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Toggle between risk-free Practice/Demo environment and Live account trading.
              </p>
            </div>

            {/* DEMO vs LIVE segmented toggle & Disconnect button */}
            <div className="flex items-center gap-2 shrink-0">
              {currentBroker.status === 'CONNECTED' && onDisconnectBroker && (
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="px-2.5 py-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  title="Disconnect broker session"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isDisconnecting ? 'DISCONNECTING...' : 'DISCONNECT'}</span>
                </button>
              )}

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  onClick={() => handleFieldChange('environment', 'DEMO')}
                  className={`px-3 py-1.5 rounded font-bold transition-colors cursor-pointer ${
                    (activeForm.environment ?? currentBroker.environment) === 'DEMO'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  DEMO / PRACTICE
                </button>
                <button
                  onClick={() => handleFieldChange('environment', 'LIVE')}
                  className={`px-3 py-1.5 rounded font-bold transition-colors cursor-pointer ${
                    (activeForm.environment ?? currentBroker.environment) === 'LIVE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  LIVE ACCOUNT
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Form */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded border border-slate-800/80">
            {selectedTab === 'CAPITAL_COM' && (
              <>
                {/* Capital.com Quick Connect Guide */}
                <div className="bg-cyan-950/40 border border-cyan-800/60 p-3 rounded text-[11px] text-cyan-200 space-y-1.5">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>How to Link Your Capital.com Demo Account (Sync 20 Live Trades):</span>
                  </div>
                  <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[10px] leading-relaxed">
                    <li>Log into your <strong>Capital.com</strong> platform (ensure top right shows <strong>Demo</strong>).</li>
                    <li>Open <strong>Settings</strong> (or Account menu) &gt; <strong>API integrations</strong>.</li>
                    <li>Under <strong>Demo account</strong>, click <strong>Generate new key</strong> and copy it.</li>
                    <li>Paste the API Key below, along with your Capital.com account email and password.</li>
                    <li>Click <strong>SAVE &amp; TEST CONNECTION</strong> below — all your live positions and balance will sync instantly!</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-400">
                        Account Email / Identifier:
                      </label>
                      {currentBroker.hasSavedIdentifier && (
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          ✓ Saved in Vault
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. trader@example.com"
                      value={activeForm.identifier ?? currentBroker.identifier ?? ''}
                      onChange={(e) => handleFieldChange('identifier', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-400">
                        Account Password / Session Secret:
                      </label>
                      {currentBroker.hasSavedApiSecret && (
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          ✓ Saved (leave blank to keep)
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      placeholder={currentBroker.hasSavedApiSecret ? '•••••••• (Saved - type to change)' : 'Enter Capital.com login password'}
                      value={activeForm.apiSecret ?? ''}
                      onChange={(e) => handleFieldChange('apiSecret', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">
                      Capital.com API Key (X-CAP-API-KEY):
                    </label>
                    {currentBroker.hasSavedApiKey && (
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        ✓ Key Saved ({currentBroker.apiKey})
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={currentBroker.hasSavedApiKey ? '•••••••• (Saved - type to change)' : 'Enter Capital.com REST API Key'}
                    value={activeForm.apiKey ?? ''}
                    onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Found in Capital.com Settings &gt; API Integrations. Note: Capital.com uses separate API keys for DEMO and LIVE accounts.
                  </span>
                </div>

                {/* Account Balance Match / Live Auto-Fetch */}
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800/80 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[11px] text-cyan-300 font-bold uppercase flex items-center gap-1.5">
                      <span>Account Balance ($ USD)</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleFetchBrokerBalance}
                      disabled={isSyncingBalance}
                      className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingBalance ? 'animate-spin' : ''}`} />
                      <span>{isSyncingBalance ? 'FETCHING FROM BROKER...' : 'FETCH LIVE BALANCE FROM BROKER'}</span>
                    </button>
                  </div>

                  {syncBalanceResult && (
                    <div
                      className={`p-2 rounded text-[11px] flex items-center gap-2 ${
                        syncBalanceResult.success
                          ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                      }`}
                    >
                      {syncBalanceResult.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span>{syncBalanceResult.message}</span>
                    </div>
                  )}

                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 10000.00 (Enter your exact Capital.com account balance)"
                    value={activeForm.customStartingBalance ?? currentBroker.customStartingBalance ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'customStartingBalance',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-cyan-300 font-bold tabular-nums focus:outline-none focus:border-cyan-500/50"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Automatically queried from Capital.com API when authenticated, or set custom to match your broker balance 1:1.
                  </span>
                </div>
              </>
            )}

            {selectedTab === 'MT5' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      MetaAPI / MT5 Account ID:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5f8a2b3c-4d5e-6f7a-8b9c"
                      value={activeForm.accountId ?? currentBroker.accountId ?? ''}
                      onChange={(e) => handleFieldChange('accountId', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      MT5 Broker Server Name:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MetaQuotes-Demo or IC-Markets-Live"
                      value={activeForm.serverName ?? currentBroker.serverName ?? 'MetaQuotes-Demo'}
                      onChange={(e) => handleFieldChange('serverName', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    MetaAPI Auth Token:
                  </label>
                  <input
                    type="password"
                    placeholder="Enter MetaAPI Cloud Trading Token"
                    value={activeForm.apiKey ?? currentBroker.apiKey ?? ''}
                    onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Enables automated MT5 terminal trade dispatch via cloud REST bridge.
                  </span>
                </div>
              </>
            )}

            {selectedTab === 'IG' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      IG API Key (X-IG-API-KEY):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 7f8a9b1c2d3e4f5a6b7c8d9e0f1"
                      value={activeForm.apiKey ?? currentBroker.apiKey ?? ''}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      IG Username / Identifier:
                    </label>
                    <input
                      type="text"
                      placeholder="Enter IG Username"
                      value={activeForm.identifier ?? currentBroker.identifier ?? ''}
                      onChange={(e) => handleFieldChange('identifier', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      IG Password / Account Secret:
                    </label>
                    <input
                      type="password"
                      placeholder="Enter IG Account Password"
                      value={activeForm.apiSecret ?? currentBroker.apiSecret ?? ''}
                      onChange={(e) => handleFieldChange('apiSecret', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      IG Account ID (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. V7A32"
                      value={activeForm.accountId ?? currentBroker.accountId ?? ''}
                      onChange={(e) => handleFieldChange('accountId', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Generated in IG Trading Platform &gt; Settings &gt; API Keys. Supports Demo (demo-api.ig.com) and Live (api.ig.com) deal execution.
                </span>
              </>
            )}
          </div>

          {/* Automated Auto-Execution Switch */}
          <div className="bg-slate-900/40 p-3.5 rounded border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-slate-200 font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Automated Execution on Chief Arbiter BUY / SELL</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Automatically dispatches market orders when a multi-agent debate produces high conviction and passes Risk Manager gates.
              </p>
            </div>

            <button
              onClick={() => onToggleAutoExecution(!currentBroker.isAutoExecutionEnabled)}
              className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                currentBroker.isAutoExecutionEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {currentBroker.isAutoExecutionEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">{testResult.success ? 'Handshake Succeeded' : 'Handshake Notice'}</div>
                <div className="text-[11px] opacity-90 mt-0.5">{testResult.message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Credentials stored locally in encrypted server vault</span>
          </div>

          <div className="flex items-center gap-2">
            {currentBroker.status === 'CONNECTED' && onDisconnectBroker && (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" />
                <span>{isDisconnecting ? 'DISCONNECTING...' : 'DISCONNECT BROKER'}</span>
              </button>
            )}

            {!isCurrentActive && (
              <button
                onClick={handleMakeActive}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer"
              >
                Set as Active Broker
              </button>
            )}

            <button
              onClick={handleSaveAndTest}
              disabled={isTesting}
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'CONNECTING...' : 'SAVE & TEST CONNECTION'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
