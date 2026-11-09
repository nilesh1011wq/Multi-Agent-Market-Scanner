import React from 'react';
import {
  Activity,
  Play,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  BookOpen,
  Flame,
  Bell,
  Wallet,
  BarChart2,
  Sliders,
  TrendingUp,
  Globe,
  Zap,
} from 'lucide-react';

export type MainViewTab = 'TERMINAL' | 'SCANNER' | 'ALERTS' | 'PAPER_TRADING' | 'SCORECARDS' | 'BROKER';

interface TopBarProps {
  activeSymbol: string;
  activeTimeframe: string;
  activeTab: MainViewTab;
  onSelectTab: (tab: MainViewTab) => void;
  isScanning: boolean;
  onRunScan: () => void;
  onRunTests: () => void;
  onOpenDocs: () => void;
  onOpenSettings: () => void;
  onOpenBrokerModal: () => void;
  testPassed: boolean | null;
  oppCount?: number;
  alertsCount?: number;
  paperEquity?: number;
  brokerEquity?: number;
  isRealBrokerAccount?: boolean;
  engineMode?: 'AI_GEMINI' | 'QUANT_DETERMINISTIC';
  engineMessage?: string;
  activeBrokerName?: string;
  activeBrokerEnvironment?: 'DEMO' | 'LIVE';
  isAutoExecutionEnabled?: boolean;
  brokerPositionsCount?: number;
  onOpenManualTicket?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSymbol,
  activeTimeframe,
  activeTab,
  onSelectTab,
  isScanning,
  onRunScan,
  onRunTests,
  onOpenDocs,
  onOpenSettings,
  onOpenBrokerModal,
  testPassed,
  oppCount = 6,
  alertsCount = 1,
  paperEquity = 10000,
  brokerEquity,
  isRealBrokerAccount = false,
  engineMode = 'QUANT_DETERMINISTIC',
  engineMessage,
  activeBrokerName = 'Capital.com',
  activeBrokerEnvironment = 'DEMO',
  isAutoExecutionEnabled = true,
  brokerPositionsCount = 0,
  onOpenManualTicket,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#090d16] px-4 flex items-center justify-between gap-4 shrink-0 z-20 font-mono">
      {/* Zone 1: Brand & View Navigation Tabs */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span className="font-display font-bold text-base text-slate-100 tracking-tight whitespace-nowrap">
            QUANT SCANNER
          </span>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1 text-xs">
          <button
            onClick={() => onSelectTab('TERMINAL')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'TERMINAL'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Chamber & Chart</span>
          </button>

          <button
            onClick={() => onSelectTab('SCANNER')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'SCANNER'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Scanner</span>
            {oppCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px]">
                {oppCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('ALERTS')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'ALERTS'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-rose-400" />
            <span>Alerts</span>
            {alertsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px]">
                {alertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('PAPER_TRADING')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'PAPER_TRADING'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paper Trading</span>
            <span className="text-[10px] text-emerald-400 hidden sm:inline tabular-nums">
              ${paperEquity.toLocaleString()}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('BROKER')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'BROKER'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Broker</span>
            {brokerEquity !== undefined && brokerEquity > 0 && (
              <span className="text-[10px] text-cyan-300 hidden md:inline tabular-nums font-semibold">
                ${brokerEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            {brokerPositionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px]">
                {brokerPositionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('SCORECARDS')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'SCORECARDS'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scorecards</span>
          </button>
        </nav>
      </div>

      {/* Zone 2: Active Instrument & Timeframe Indicators + Engine Status */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-slate-500">ACTIVE:</span>
          <span className="font-semibold text-cyan-300">{activeSymbol}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200">{activeTimeframe}</span>
        </div>

        {engineMode === 'QUANT_DETERMINISTIC' ? (
          <div
            className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/60 text-amber-300 px-2.5 py-1 rounded text-[11px] font-mono"
            title={engineMessage || 'Free-tier daily quota conserved. All 10 specialist agents and Chief Arbiter operate deterministically on 100% full feature snapshot.'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold">QUANT ENGINE</span>
            <span className="text-amber-400/80 text-[10px] hidden xl:inline">(QUOTA CONSERVED)</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 px-2.5 py-1 rounded text-[11px] font-mono"
            title="Gemini 3.8 Flash specialist agents ensemble online."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="font-semibold">AI ENSEMBLE</span>
            <span className="text-cyan-400/80 text-[10px] hidden xl:inline">(GEMINI 3.8 FLASH)</span>
          </div>
        )}

        {testPassed !== null && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">TESTS VERIFIED</span>
          </div>
        )}
      </div>

      {/* Zone 3: Actions & Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Instant Manual Order Ticket Button */}
        {onOpenManualTicket && (
          <button
            onClick={onOpenManualTicket}
            className="px-2.5 py-1.5 text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm shadow-cyan-500/20"
            title="Open Instant Broker Order Ticket (Capital.com, MT5, IG Markets)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NEW TRADE</span>
            <span className="sm:hidden">TRADE</span>
          </button>
        )}

        {/* Broker Gateway Button */}
        <button
          onClick={onOpenBrokerModal}
          className={`px-2.5 py-1.5 text-xs rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeBrokerEnvironment === 'LIVE'
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-300 hover:bg-rose-900/50'
              : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700/80'
          }`}
          title="Connect & Configure Capital.com, MT5, or IG Markets credentials"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold">{activeBrokerName}</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
              activeBrokerEnvironment === 'LIVE'
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {activeBrokerEnvironment} {isRealBrokerAccount ? '· LIVE' : '· SANDBOX'}
          </span>
          {isAutoExecutionEnabled && (
            <span className="text-[9px] text-emerald-400 font-bold hidden sm:inline">⚡AUTO</span>
          )}
        </button>

        <button
          onClick={onRunTests}
          className="px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          title="Run feature engine verification tests"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">TESTS</span>
        </button>

        <button
          onClick={onOpenDocs}
          className="px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          title="View 10 Specialist Agent Prompts & Architecture"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">DOCS</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700 transition-colors cursor-pointer"
          title="Open Risk & System Settings"
        >
          <Sliders className="w-4 h-4 text-slate-300" />
        </button>

        <button
          onClick={onRunScan}
          disabled={isScanning}
          className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-cyan-500/10 cursor-pointer"
        >
          {isScanning ? (
            <>
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>SCANNING...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>SCAN</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
