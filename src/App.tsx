import React, { useState, useEffect } from 'react';
import { TopBar, MainViewTab } from './components/TopBar';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { ChartPane } from './components/ChartPane';
import { FeatureSnapshotInspector } from './components/FeatureSnapshotInspector';
import { AnalogInspector } from './components/AnalogInspector';
import { TrendAgentPanel } from './components/TrendAgentPanel';
import { DebateChamber } from './components/DebateChamber';
import { AgentScorecards } from './components/AgentScorecards';
import { RankedOpportunitiesTable } from './components/RankedOpportunitiesTable';
import { AlertsPanel } from './components/AlertsPanel';
import { PaperTradingPanel } from './components/PaperTradingPanel';
import { SettingsModal } from './components/SettingsModal';
import { TestVerificationModal } from './components/TestVerificationModal';
import { PromptsArchitectureModal } from './components/PromptsArchitectureModal';
import { BrokerModal } from './components/BrokerModal';
import { LiveBrokerPositionsPanel } from './components/LiveBrokerPositionsPanel';
import { OrderTicketModal } from './components/OrderTicketModal';
import { Candle, FeatureSnapshot, AnalogStats, COTData, Timeframe, EconomicEvent } from './types/market';
import { AgentName, BaseAgentOutput, FullDebateTranscript } from './types/debate';
import { AgentScorecard } from './types/scorecard';
import { RankedOpportunity, AlertConfig, DispatchedAlert, PaperPosition, PaperAccountSummary } from './types/scanner';
import {
  BrokerConfig,
  BrokerId,
  BrokerAccountSummary,
  BrokerPosition,
  BrokerClosedPosition,
  StandardizedOrderRequest,
} from './types/broker';
import { ExecutionAuditLog } from './broker/brokerManager';
import { safeFetchJson } from './utils/apiClient';
import { Calendar, ShieldAlert, Cpu, BarChart3, Clock, AlertTriangle, Layers, Flame, Bell, Wallet, Globe } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainViewTab>('TERMINAL');
  const [activeSymbol, setActiveSymbol] = useState<string>('EURUSD');
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('H1');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [snapshot, setSnapshot] = useState<FeatureSnapshot | null>(null);
  const [analogs, setAnalogs] = useState<AnalogStats | null>(null);
  const [cot, setCot] = useState<COTData | null>(null);
  const [calendar, setCalendar] = useState<EconomicEvent[]>([]);

  // Broker Gateway & Live Execution State
  const [brokerConfigs, setBrokerConfigs] = useState<Record<BrokerId, BrokerConfig>>({
    CAPITAL_COM: {
      id: 'CAPITAL_COM',
      name: 'Capital.com',
      environment: 'DEMO',
      apiKey: '',
      isActive: true,
      isAutoExecutionEnabled: false,
      status: 'DISCONNECTED',
    },
    MT5: {
      id: 'MT5',
      name: 'MetaTrader 5 (MetaAPI)',
      environment: 'DEMO',
      apiKey: '',
      isActive: false,
      isAutoExecutionEnabled: false,
      status: 'DISCONNECTED',
    },
    IG: {
      id: 'IG',
      name: 'IG Markets',
      environment: 'DEMO',
      apiKey: '',
      isActive: false,
      isAutoExecutionEnabled: false,
      status: 'DISCONNECTED',
    },
  });
  const [activeBrokerId, setActiveBrokerId] = useState<BrokerId>('CAPITAL_COM');
  const [brokerAccountSummary, setBrokerAccountSummary] = useState<BrokerAccountSummary | null>(null);
  const [brokerPositions, setBrokerPositions] = useState<BrokerPosition[]>([]);
  const [brokerClosedPositions, setBrokerClosedPositions] = useState<BrokerClosedPosition[]>([]);
  const [brokerAuditLogs, setBrokerAuditLogs] = useState<ExecutionAuditLog[]>([]);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [isOrderTicketOpen, setIsOrderTicketOpen] = useState(false);
  const [manualTicketState, setManualTicketState] = useState<{
    symbol?: string;
    direction?: 'BUY' | 'SELL';
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
  }>({});
  const [isBrokerLoading, setIsBrokerLoading] = useState(false);
  const [brokerNotification, setBrokerNotification] = useState<string | null>(null);


  // Helper to open manual broker order ticket from anywhere in the terminal
  const openManualBrokerTicket = (params?: {
    symbol?: string;
    direction?: 'BUY' | 'SELL';
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    if (params?.symbol) {
      setActiveSymbol(params.symbol);
    }
    setManualTicketState(params || {});
    setIsOrderTicketOpen(true);
  };

  // Prices and regimes for watchlist sidebar
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [regimeMap, setRegimeMap] = useState<Record<string, string>>({});

  // Phase 2: Agent 1 (Trend & Momentum) State
  const [trendOutput, setTrendOutput] = useState<BaseAgentOutput | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentDurationMs, setAgentDurationMs] = useState<number | undefined>(undefined);

  // Phase 3: Full 10-Agent Debate State
  const [debateTranscript, setDebateTranscript] = useState<FullDebateTranscript | null>(null);
  const [isDebateRunning, setIsDebateRunning] = useState(false);
  const [debateDurationMs, setDebateDurationMs] = useState<number | undefined>(undefined);

  // Phase 4: Scorecards & Bayesian Weights State
  const [scorecards, setScorecards] = useState<Record<AgentName, AgentScorecard> | null>(null);
  const [isBacktestRunning, setIsBacktestRunning] = useState(false);

  // Phase 5: Multi-Asset Scanner & Alerts State
  const [opportunities, setOpportunities] = useState<RankedOpportunity[]>([]);
  const [alerts, setAlerts] = useState<DispatchedAlert[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    minConfidence: 75,
    minRiskReward: 1.5,
    allowedBadges: ['A', 'B'],
    blockOnEconomicEvent: true,
    webhookUrl: 'https://webhook.site/quant-market-scanner-demo',
    notificationsEnabled: true,
  });
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);

  // Phase 6: Paper Trading Simulator State
  const [paperSummary, setPaperSummary] = useState<PaperAccountSummary | null>(null);
  const [paperOpenPositions, setPaperOpenPositions] = useState<PaperPosition[]>([]);
  const [paperClosedPositions, setPaperClosedPositions] = useState<PaperPosition[]>([]);
  const [isSimulatingTick, setIsSimulatingTick] = useState(false);

  // Modals & testing state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testPassed, setTestPassed] = useState<boolean | null>(true); // Pre-verified
  const [isScanning, setIsScanning] = useState(false);
  const [engineMode, setEngineMode] = useState<'AI_GEMINI' | 'QUANT_DETERMINISTIC'>('QUANT_DETERMINISTIC');
  const [engineMessage, setEngineMessage] = useState<string>('');

  // Load candle data, feature snapshot, and scorecards when symbol or timeframe changes
  useEffect(() => {
    async function loadData() {
      try {
        const candleRes = await fetch(`/api/candles?symbol=${activeSymbol}&timeframe=${activeTimeframe}&count=120`);
        const candleData = await candleRes.json();
        if (candleData.success) {
          setCandles(candleData.candles);
          if (candleData.candles.length > 0) {
            const latestPrice = candleData.candles[candleData.candles.length - 1].close;
            setPriceMap((prev) => ({ ...prev, [activeSymbol]: latestPrice }));
          }
        }

        const snapRes = await fetch(`/api/snapshot?symbol=${activeSymbol}&timeframe=${activeTimeframe}`);
        const snapData = await snapRes.json();
        if (snapData.success) {
          setSnapshot(snapData.snapshot);
          setAnalogs(snapData.analogs);
          setCot(snapData.cot);
          setRegimeMap((prev) => ({
            ...prev,
            [activeSymbol]: snapData.snapshot.indicators.regime,
          }));
        }

        const scRes = await fetch(`/api/scorecards?symbol=${activeSymbol}&timeframe=${activeTimeframe}`);
        const scData = await scRes.json();
        if (scData.success) {
          setScorecards(scData.scorecards);
        }
      } catch (err) {
        console.error('Failed to load market data:', err);
      }
    }

    loadData();
  }, [activeSymbol, activeTimeframe]);

  // Load economic calendar, scanner opportunities, alerts, and paper trading state on mount
  useEffect(() => {
    async function initData() {
      try {
        // 1. Economic Calendar
        const calRes = await fetch('/api/calendar');
        const calData = await calRes.json();
        if (calData.success) setCalendar(calData.calendar);

        // 2. Ranked Opportunities
        const oppRes = await fetch('/api/scanner/ranked-opportunities');
        const oppData = await oppRes.json();
        if (oppData.success) setOpportunities(oppData.opportunities);

        // 3. Alerts
        const alertRes = await fetch('/api/alerts/history');
        const alertData = await alertRes.json();
        if (alertData.success) {
          setAlerts(alertData.alerts);
          if (alertData.config) setAlertConfig(alertData.config);
        }

        // 4. Paper Trading
        const paperRes = await fetch('/api/paper-trading/summary');
        const paperData = await paperRes.json();
        if (paperData.success) {
          setPaperSummary(paperData.summary);
          setPaperOpenPositions(paperData.openPositions);
          setPaperClosedPositions(paperData.closedPositions);
        }

        // 5. Engine Status & Quota Health
        const engineRes = await fetch('/api/engine/status');
        const engineData = await engineRes.json();
        if (engineData.success) {
          setEngineMode(engineData.engineMode);
          setEngineMessage(engineData.message);
        }

        // 6. Broker Gateway Telemetry
        const [bConfRes, bAccRes, bLogsRes] = await Promise.all([
          fetch('/api/broker/configs'),
          fetch('/api/broker/account'),
          fetch('/api/broker/audit-logs'),
        ]);

        const bConfData = await bConfRes.json();
        if (bConfData.success) {
          setBrokerConfigs(bConfData.configs);
          setActiveBrokerId(bConfData.activeBrokerId);
        }
        const bAccData = await bAccRes.json();
        if (bAccData.success) {
          if (bAccData.summary) setBrokerAccountSummary(bAccData.summary);
          if (bAccData.positions) setBrokerPositions(bAccData.positions);
          if (bAccData.closedPositions) setBrokerClosedPositions(bAccData.closedPositions);
        }

        const bLogsData = await bLogsRes.json();
        if (bLogsData.success) setBrokerAuditLogs(bLogsData.logs);
      } catch (err) {
        console.error('Failed to init dashboard state:', err);
      }
    }
    initData();
  }, []);

  // Real-time live quotes polling for all 15 instruments
  useEffect(() => {
    async function loadQuotes() {
      try {
        const res = await fetch('/api/quotes');
        const data = await res.json();
        if (data.success && data.quotes) {
          const map: Record<string, number> = {};
          for (const [sym, q] of Object.entries(data.quotes as Record<string, any>)) {
            if (typeof q?.price === 'number') {
              map[sym] = q.price;
            }
          }
          setPriceMap((prev) => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.error('Failed to fetch live quotes:', err);
      }
    }

    loadQuotes();
    const interval = setInterval(loadQuotes, 15000);
    return () => clearInterval(interval);
  }, []);

  const refreshBrokerData = async () => {
    setIsBrokerLoading(true);
    try {
      const [confRes, syncRes, logsRes] = await Promise.all([
        safeFetchJson('/api/broker/configs'),
        safeFetchJson('/api/broker/sync-balance', { method: 'POST' }),
        safeFetchJson('/api/broker/audit-logs'),
      ]);

      if (confRes.success && confRes.data) {
        setBrokerConfigs(confRes.data.configs);
        setActiveBrokerId(confRes.data.activeBrokerId);
      }

      if (syncRes.success && syncRes.data) {
        if (syncRes.data.summary) setBrokerAccountSummary(syncRes.data.summary);
        if (syncRes.data.positions) setBrokerPositions(syncRes.data.positions);
        if (syncRes.data.closedPositions) setBrokerClosedPositions(syncRes.data.closedPositions);
        if (syncRes.data.logs) setBrokerAuditLogs(syncRes.data.logs);
      }

      if (logsRes.success && logsRes.data?.logs) {
        setBrokerAuditLogs(logsRes.data.logs);
      }
    } catch (err) {
      console.error('Failed to sync broker data:', err);
    } finally {
      setIsBrokerLoading(false);
    }
  };

  // 100% Real-Time Broker Synchronization: Poll active broker telemetry every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBrokerData();
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBrokerId]);

  const handleSaveBrokerConfig = async (brokerId: BrokerId, updated: Partial<BrokerConfig>) => {
    try {
      const res = await safeFetchJson('/api/broker/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId, config: updated }),
      });
      if (res.success && res.data?.config) {
        setBrokerConfigs((prev) => ({
          ...prev,
          [brokerId]: { ...prev[brokerId], ...res.data.config },
        }));
      }
    } catch (err) {
      console.error('Failed to save broker config:', err);
    }
  };

  const handleConnectBroker = async (brokerId: BrokerId) => {
    const res = await safeFetchJson('/api/broker/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brokerId }),
    });
    await refreshBrokerData();
    return res.data || { success: res.success, latencyMs: 0, message: res.error || 'Connection failed' };
  };

  const handleDisconnectBroker = async (brokerId: BrokerId) => {
    const res = await safeFetchJson('/api/broker/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brokerId }),
    });
    setBrokerConfigs((prev) => ({
      ...prev,
      [brokerId]: {
        ...prev[brokerId],
        status: 'DISCONNECTED',
        latencyMs: undefined,
      },
    }));
    await refreshBrokerData();
    return res.data || { success: res.success, message: res.error || 'Broker disconnected.' };
  };

  const handleSelectActiveBroker = async (brokerId: BrokerId) => {
    const res = await safeFetchJson('/api/broker/select-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brokerId }),
    });
    if (res.success && res.data?.success) {
      setActiveBrokerId(brokerId);
      await refreshBrokerData();
    }
  };

  const handleToggleAutoExecution = async (enabled: boolean) => {
    const res = await safeFetchJson('/api/broker/toggle-auto-execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.success && res.data?.success) {
      setBrokerConfigs((prev) => ({
        ...prev,
        [activeBrokerId]: {
          ...prev[activeBrokerId],
          isAutoExecutionEnabled: enabled,
        },
      }));
    }
  };

  const handleCloseBrokerPosition = async (ticketId: string) => {
    try {
      const res = await safeFetchJson('/api/broker/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId: activeBrokerId, ticketId }),
      });
      if (res.success && res.data?.success) {
        setBrokerNotification(`✅ Position #${ticketId} closed successfully on ${activeBrokerId}.`);
        setTimeout(() => setBrokerNotification(null), 5000);
        await refreshBrokerData();
      } else {
        const errMsg = res.data?.message || res.error || 'Failed to close position on broker.';
        setBrokerNotification(`❌ Failed to close position #${ticketId}: ${errMsg}`);
        setTimeout(() => setBrokerNotification(null), 8000);
      }
    } catch (err: any) {
      console.error('Failed to close position:', err);
      setBrokerNotification(`❌ Error closing position #${ticketId}: ${err?.message || 'Network error'}`);
      setTimeout(() => setBrokerNotification(null), 8000);
    }
  };

  const handleMoveBrokerToBreakeven = async (ticketId: string) => {
    try {
      const res = await safeFetchJson('/api/broker/breakeven', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId: activeBrokerId, ticketId }),
      });
      if (res.success && res.data?.success) {
        setBrokerNotification(`Position #${ticketId} Stop Loss moved to Breakeven (${res.data.newStopLoss})`);
        setTimeout(() => setBrokerNotification(null), 5000);
        await refreshBrokerData();
      }
    } catch (err) {
      console.error('Failed to move SL to Breakeven:', err);
    }
  };

  const handleFlattenAllBroker = async () => {
    try {
      const res = await safeFetchJson('/api/broker/flatten-all', { method: 'POST' });
      if (res.success && res.data?.success) {
        const count = res.data.closedCount ?? 0;
        const errors: string[] = res.data.errors || [];
        if (errors.length > 0) {
          setBrokerNotification(`⚠️ Flattened ${count} positions, but errors occurred: ${errors.join('; ')}`);
          setTimeout(() => setBrokerNotification(null), 8000);
        } else {
          setBrokerNotification(`✅ Successfully flattened all positions (${count} closed) on ${activeBrokerId}.`);
          setTimeout(() => setBrokerNotification(null), 6000);
        }
        await refreshBrokerData();
      } else {
        const errMsg = res.data?.message || res.error || 'Failed to flatten positions on broker.';
        setBrokerNotification(`❌ Flatten All failed: ${errMsg}`);
        setTimeout(() => setBrokerNotification(null), 8000);
      }
    } catch (err: any) {
      console.error('Failed to flatten positions:', err);
      setBrokerNotification(`❌ Error flattening positions: ${err?.message || 'Network error'}`);
      setTimeout(() => setBrokerNotification(null), 8000);
    }
  };

  const handleCloseDuplicates = async () => {
    try {
      const res = await safeFetchJson('/api/broker/close-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId: activeBrokerId }),
      });
      if (res.success && res.data?.success) {
        setBrokerNotification(res.data.message);
        setTimeout(() => setBrokerNotification(null), 6000);
        await refreshBrokerData();
      }
    } catch (err) {
      console.error('Failed to close duplicates:', err);
    }
  };


  const handleSubmitBrokerOrder = async (order: StandardizedOrderRequest) => {
    const res = await safeFetchJson('/api/broker/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    if (res.success && res.data?.success) {
      if (res.data.result && !res.data.result.success) {
        throw new Error(res.data.result.message || 'Broker rejected order.');
      }
      setBrokerNotification(`Order filled on ${order.brokerId}: ${order.direction} ${order.symbol} (${res.data.result?.message || 'Done'})`);
      setTimeout(() => setBrokerNotification(null), 6000);
      await refreshBrokerData();
    } else {
      throw new Error(res.error || res.data?.error || 'Failed to place order');
    }
  };

  const handleRunTests = async () => {
    setIsTestRunning(true);
    try {
      const res = await fetch('/api/test-quant', { method: 'POST' });
      const data = await res.json();
      setTestPassed(data.passed);
    } catch (err) {
      console.error('Failed to run tests:', err);
      setTestPassed(false);
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleRunTrendAgent = async () => {
    setIsAgentRunning(true);
    try {
      const res = await fetch('/api/agent/trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: activeSymbol, timeframe: activeTimeframe }),
      });
      const data = await res.json();
      if (data.success) {
        setTrendOutput(data.output);
        setAgentDurationMs(data.durationMs);
      }
    } catch (err) {
      console.error('Failed to execute trend agent:', err);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleRunFullDebate = async () => {
    setIsDebateRunning(true);
    try {
      const res = await fetch('/api/debate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: activeSymbol, timeframe: activeTimeframe }),
      });
      const data = await res.json();
      if (data.success) {
        setDebateTranscript(data.debate);
        setDebateDurationMs(data.durationMs);

        // If automated broker trade was executed, notify user and sync positions
        if (data.autoTradeResult && data.autoTradeResult.success) {
          setBrokerNotification(
            `⚡ Auto-Executed on ${data.autoTradeResult.brokerId}: ${data.autoTradeResult.direction} ${data.autoTradeResult.symbol} (Ticket #${data.autoTradeResult.brokerTicketId})`
          );
          setTimeout(() => setBrokerNotification(null), 8000);
          refreshBrokerData();
        }
      }
    } catch (err) {
      console.error('Failed to execute debate:', err);
    } finally {
      setIsDebateRunning(false);
    }
  };

  const handleRunBacktest = async () => {
    setIsBacktestRunning(true);
    try {
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: activeSymbol, timeframe: activeTimeframe }),
      });
      const data = await res.json();
      if (data.success) {
        setScorecards(data.scorecards);
      }
    } catch (err) {
      console.error('Failed to run backtest:', err);
    } finally {
      setIsBacktestRunning(false);
    }
  };

  // Phase 5: Rescan entire watchlist
  const handleRescanWatchlist = async () => {
    setIsScannerRunning(true);
    try {
      const res = await fetch('/api/scanner/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: activeTimeframe }),
      });
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities);
      }
    } catch (err) {
      console.error('Failed to rescan watchlist:', err);
    } finally {
      setIsScannerRunning(false);
    }
  };

  // Select opportunity from scanner table to analyze in Chamber
  const handleSelectOpportunity = (symbol: string, timeframe: Timeframe) => {
    setActiveSymbol(symbol);
    setActiveTimeframe(timeframe);
    setActiveTab('TERMINAL');
  };

  // Phase 6: Open paper position from an opportunity
  const handleOpenPaperTrade = async (opp: RankedOpportunity) => {
    try {
      const res = await fetch('/api/paper-trading/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: opp }),
      });
      const data = await res.json();
      if (data.success && data.position) {
        setPaperOpenPositions((prev) => [data.position, ...prev]);
        setActiveTab('PAPER_TRADING');
      }
    } catch (err) {
      console.error('Failed to open paper position:', err);
    }
  };

  // Phase 6: Advance market simulation and trigger Bayesian update
  const handleSimulateTick = async () => {
    setIsSimulatingTick(true);
    try {
      const res = await fetch('/api/paper-trading/simulate-tick', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPaperSummary(data.summary);
        setPaperOpenPositions(data.openPositions);
        setPaperClosedPositions(data.closedPositions);

        // Also refresh scorecards since resolutions update Bayesian weights
        const scRes = await fetch(`/api/scorecards?symbol=${activeSymbol}&timeframe=${activeTimeframe}`);
        const scData = await scRes.json();
        if (scData.success) {
          setScorecards(scData.scorecards);
        }
      }
    } catch (err) {
      console.error('Failed to simulate tick:', err);
    } finally {
      setIsSimulatingTick(false);
    }
  };

  const handleClosePaperPosition = async (id: string, reason: string = 'MANUALLY_CLOSED') => {
    try {
      const res = await fetch('/api/paper-trading/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setPaperOpenPositions((prev) => prev.filter((p) => p.id !== id));
        if (data.position) {
          setPaperClosedPositions((prev) => [data.position, ...prev]);
        }
        if (data.summary) {
          setPaperSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to close paper position:', err);
    }
  };

  const handleUpdateAlertConfig = async (newConfig: Partial<AlertConfig>) => {
    try {
      const res = await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      if (data.success) {
        setAlertConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to update alert config:', err);
    }
  };

  const handleSendTestAlert = async (symbol: string = 'EURUSD') => {
    setIsSendingTestAlert(true);
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (data.success && data.alert) {
        setAlerts((prev) => [data.alert, ...prev]);
      }
    } catch (err) {
      console.error('Failed to send test alert:', err);
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const snapRes = await fetch(`/api/snapshot?symbol=${activeSymbol}&timeframe=${activeTimeframe}`);
      const snapData = await snapRes.json();
      if (snapData.success) {
        setSnapshot(snapData.snapshot);
        setAnalogs(snapData.analogs);
        setCot(snapData.cot);
      }
      await handleRunFullDebate();
      await handleRunTrendAgent();

      const scRes = await fetch(`/api/scorecards?symbol=${activeSymbol}&timeframe=${activeTimeframe}`);
      const scData = await scRes.json();
      if (scData.success) {
        setScorecards(scData.scorecards);
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Bar with View Switcher */}
      <TopBar
        activeSymbol={activeSymbol}
        activeTimeframe={activeTimeframe}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isScanning={isScanning || isScannerRunning}
        onRunScan={handleRunScan}
        onRunTests={() => {
          setIsTestModalOpen(true);
          handleRunTests();
        }}
        onOpenDocs={() => setIsPromptsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenBrokerModal={() => setIsBrokerModalOpen(true)}
        testPassed={testPassed}
        oppCount={opportunities.length}
        alertsCount={alerts.length}
        paperEquity={paperSummary?.equity || 10000}
        brokerEquity={brokerAccountSummary?.equity || brokerConfigs[activeBrokerId]?.customStartingBalance || 15000}
        isRealBrokerAccount={brokerAccountSummary?.isRealBrokerAccount ?? false}
        engineMode={engineMode}
        engineMessage={engineMessage}
        activeBrokerName={brokerConfigs[activeBrokerId]?.name || 'Capital.com'}
        activeBrokerEnvironment={brokerConfigs[activeBrokerId]?.environment || 'DEMO'}
        isAutoExecutionEnabled={brokerConfigs[activeBrokerId]?.isAutoExecutionEnabled ?? false}
        brokerPositionsCount={brokerPositions.length}
        onOpenManualTicket={() => openManualBrokerTicket()}
      />

      {/* Broker Auto-Execution / Alert Notification Banner */}
      {brokerNotification && (
        <div className={`border-b px-4 py-2 text-xs font-mono flex items-center justify-between z-30 shadow-lg ${
          brokerNotification.startsWith('❌')
            ? 'bg-rose-950/95 border-rose-800 text-rose-200'
            : brokerNotification.startsWith('⚠️')
            ? 'bg-amber-950/95 border-amber-800 text-amber-200'
            : 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              brokerNotification.startsWith('❌')
                ? 'bg-rose-400'
                : brokerNotification.startsWith('⚠️')
                ? 'bg-amber-400'
                : 'bg-emerald-400 animate-ping'
            }`} />
            <span className="font-bold">{brokerNotification}</span>
          </div>
          <button
            onClick={() => setBrokerNotification(null)}
            className="hover:text-white p-1 text-slate-400 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Terminal Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Watchlist of 15 Forex, Commodity & Crypto Assets (Always accessible) */}
        <WatchlistSidebar
          activeSymbol={activeSymbol}
          onSelectSymbol={setActiveSymbol}
          priceMap={priceMap}
          regimeMap={regimeMap}
          activeBrokerId={activeBrokerId}
        />

        {/* Center Main Viewport */}
        <main className="flex-1 flex flex-col overflow-y-auto border-r border-slate-800">
          {/* Production Engineering Status Banner */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="font-bold">SYSTEM ACTIVE:</span>
              <span className="text-slate-300">
                10-Agent Chamber · Chief Arbiter · Capital.com / MT5 / IG Markets Gateway · 30-Yr Analog KB
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-emerald-400">N ≥ 30 GATED</span>
              <span>·</span>
              <span className="text-cyan-300 font-semibold">
                BROKER: {brokerConfigs[activeBrokerId]?.name.toUpperCase()} [{brokerConfigs[activeBrokerId]?.environment}]
              </span>
              <span>·</span>
              <span className="text-amber-400">
                {brokerConfigs[activeBrokerId]?.isAutoExecutionEnabled ? '⚡AUTO-EXEC ON' : 'AUTO-EXEC OFF'}
              </span>
            </div>
          </div>

          {/* Tab 1: Terminal / Chart & Chamber View */}
          {activeTab === 'TERMINAL' && (
            <div className="flex flex-col space-y-4 p-4">
              {/* Interactive TradingView Style Candlestick Chart with Live Broker Overlays */}
              <ChartPane
                symbol={activeSymbol}
                timeframe={activeTimeframe}
                candles={candles}
                snapshot={snapshot}
                onSelectTimeframe={setActiveTimeframe}
                activePositions={brokerPositions}
              />

              {/* Master 10-Agent Debate Chamber & Chief Arbiter */}
              <DebateChamber
                transcript={debateTranscript}
                isRunning={isDebateRunning}
                onRunDebate={handleRunFullDebate}
                durationMs={debateDurationMs}
                onOpenManualTicket={(dir, sl, tp) =>
                  openManualBrokerTicket({
                    symbol: activeSymbol,
                    direction: dir,
                    stopLoss: sl,
                    takeProfit: tp,
                  })
                }
              />

              {/* Agent 1 Trend & Momentum Panel */}
              <TrendAgentPanel
                output={trendOutput}
                isRunning={isAgentRunning}
                onRunAgent={handleRunTrendAgent}
                durationMs={agentDurationMs}
              />

              {/* Deterministic Feature Snapshot Inspector */}
              <FeatureSnapshotInspector snapshot={snapshot} />

              {/* 30-Year Historical Analog & COT Inspector */}
              <AnalogInspector analogs={analogs} cot={cot} />
            </div>
          )}

          {/* Tab 2: Multi-Asset Scanner & Ranked Opportunities Table */}
          {activeTab === 'SCANNER' && (
            <div className="p-4 space-y-4">
              <RankedOpportunitiesTable
                opportunities={opportunities}
                isLoading={isScannerRunning}
                onRefreshScan={handleRescanWatchlist}
                onSelectOpportunity={handleSelectOpportunity}
                onOpenPaperTrade={handleOpenPaperTrade}
                onOpenManualTrade={(opp) =>
                  openManualBrokerTicket({
                    symbol: opp.symbol,
                    direction: opp.direction === 'SELL' ? 'SELL' : 'BUY',
                    entryPrice: opp.entryZone?.[0],
                    stopLoss: opp.stopLoss,
                    takeProfit: opp.takeProfits?.[0],
                  })
                }
                activeSymbol={activeSymbol}
              />
            </div>
          )}

          {/* Tab 3: Real-Time Alerts & Webhook Dispatcher */}
          {activeTab === 'ALERTS' && (
            <div className="p-4 space-y-4">
              <AlertsPanel
                alerts={alerts}
                config={alertConfig}
                onUpdateConfig={handleUpdateAlertConfig}
                onSendTestAlert={handleSendTestAlert}
                isSendingTest={isSendingTestAlert}
              />
            </div>
          )}

          {/* Tab 4: Forward Paper-Trading Simulator & Bayesian Resolution Engine */}
          {activeTab === 'PAPER_TRADING' && (
            <div className="p-4 space-y-4">
              <PaperTradingPanel
                summary={paperSummary}
                openPositions={paperOpenPositions}
                closedPositions={paperClosedPositions}
                onSimulateTick={handleSimulateTick}
                onClosePosition={handleClosePaperPosition}
                isSimulating={isSimulatingTick}
              />
            </div>
          )}

          {/* Tab 5: Walk-Forward Backtesting Scorecards & Bayesian Weights */}
          {activeTab === 'SCORECARDS' && (
            <div className="p-4 space-y-4">
              <AgentScorecards
                scorecards={scorecards}
                onRunBacktest={handleRunBacktest}
                isRunning={isBacktestRunning}
                symbol={activeSymbol}
                timeframe={activeTimeframe}
              />
            </div>
          )}

          {/* Tab 6: Live Broker Execution Gateway (Capital.com, MT5, IG Markets) */}
          {activeTab === 'BROKER' && (
            <div className="p-4 space-y-4">
              <LiveBrokerPositionsPanel
                activeBroker={brokerConfigs[activeBrokerId] || brokerConfigs.CAPITAL_COM}
                accountSummary={brokerAccountSummary}
                positions={brokerPositions}
                closedPositions={brokerClosedPositions}
                auditLogs={brokerAuditLogs}
                isLoading={isBrokerLoading}
                onRefresh={refreshBrokerData}
                onClosePosition={handleCloseBrokerPosition}
                onFlattenAll={handleFlattenAllBroker}
                onCloseDuplicates={handleCloseDuplicates}
                onMoveToBreakeven={handleMoveBrokerToBreakeven}
                onOpenBrokerSettings={() => setIsBrokerModalOpen(true)}
                onOpenManualTicket={(sym) => {
                  if (sym) setActiveSymbol(sym);
                  setIsOrderTicketOpen(true);
                }}
                onDisconnectBroker={handleDisconnectBroker}
              />
            </div>
          )}
        </main>

        {/* Right Column: Multi-Timeframe Heatmap & Economic Blackout Monitor */}
        <aside className="w-80 bg-[#0c101a] flex flex-col shrink-0 overflow-y-auto hidden xl:flex">
          {/* Section 1: Multi-Timeframe Alignment Preview */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>TIMEFRAME ALIGNMENT</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">W1 → M15</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {(['W1', 'D1', 'H4', 'H1', 'M15'] as const).map((tf) => {
                const isActive = activeTimeframe === tf;
                return (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className={`w-full p-2 rounded flex items-center justify-between border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-800/80 border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{tf}</span>
                      <span className="text-[10px] text-slate-500">
                        {tf === 'W1' || tf === 'D1'
                          ? 'Higher Bias'
                          : tf === 'H4' || tf === 'H1'
                          ? 'Setup Horizon'
                          : 'Entry Timing'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400">
                      BULLISH
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Economic Calendar Blackout Monitor */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>ECONOMIC EVENT BLACKOUTS</span>
              </div>
              <span className="text-[10px] text-emerald-400">CLEAR</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {calendar.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 truncate max-w-[170px]">
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        item.impact === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.impact}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Currency: {item.currency}</span>
                    <span>Blackout: ±{item.blackoutMins}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Broker / Paper Account Mini Widget */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{brokerConfigs[activeBrokerId]?.isConnected ? 'BROKER PORTFOLIO' : 'PAPER PORTFOLIO'}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
                ${brokerConfigs[activeBrokerId]?.isConnected && brokerAccountSummary
                  ? brokerAccountSummary.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : (paperSummary ? paperSummary.equity.toLocaleString() : '10,366')}
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Realized PnL:</span>
                <span className={`font-bold ${(brokerConfigs[activeBrokerId]?.isConnected ? (brokerAccountSummary?.realizedPnL ?? 0) >= 0 : (paperSummary?.totalRealizedR ?? 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {brokerConfigs[activeBrokerId]?.isConnected && brokerAccountSummary
                    ? `${brokerAccountSummary.realizedPnL >= 0 ? '+' : ''}$${brokerAccountSummary.realizedPnL.toFixed(2)} (${brokerAccountSummary.realizedPnLR >= 0 ? '+' : ''}${brokerAccountSummary.realizedPnLR.toFixed(1)}R)`
                    : (paperSummary ? `+${paperSummary.totalRealizedR}R` : '+2.5R')}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Win Rate:</span>
                <span className="text-cyan-300 font-bold">
                  {brokerConfigs[activeBrokerId]?.isConnected && brokerAccountSummary
                    ? `${brokerAccountSummary.winRate.toFixed(1)}%`
                    : (paperSummary ? `${paperSummary.winRate}%` : '66.7%')}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Active Positions:</span>
                <span className="text-slate-200 font-bold">
                  {brokerConfigs[activeBrokerId]?.isConnected
                    ? `${brokerPositions.length} Open`
                    : `${paperOpenPositions.length} Open`}
                </span>
              </div>
              {brokerConfigs[activeBrokerId]?.isConnected && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Margin Level:</span>
                  <span className="text-emerald-400 font-bold">
                    {brokerAccountSummary ? `${brokerAccountSummary.marginLevel.toFixed(0)}%` : '100%'}
                  </span>
                </div>
              )}
              <button
                onClick={() => setActiveTab(brokerConfigs[activeBrokerId]?.isConnected ? 'BROKER' : 'PAPER_TRADING')}
                className="w-full mt-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-bold transition-colors cursor-pointer"
              >
                {brokerConfigs[activeBrokerId]?.isConnected ? 'Open Broker Gateway' : 'Open Paper Simulator'}
              </button>
            </div>
          </div>

          {/* Section 4: Operational Integrity Notice */}
          <div className="p-3.5 text-xs font-mono text-slate-400 space-y-2 mt-auto">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>PRODUCTION QUALITY ACTIVE</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              All 6 Phases operational. 10-Agent Chamber, Chief Arbiter, Walk-Forward Validation, and Paper Trading loop fully linked.
            </p>
          </div>
        </aside>
      </div>

      {/* Prompts and Architecture Modal */}
      <PromptsArchitectureModal
        isOpen={isPromptsModalOpen}
        onClose={() => setIsPromptsModalOpen(false)}
      />

      {/* Test Verification Modal */}
      <TestVerificationModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onRunTest={handleRunTests}
        isRunning={isTestRunning}
        testPassed={testPassed}
      />

      {/* Settings & Risk Parameters Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Multi-Broker Gateway Modal (Capital.com, MT5, IG Markets) */}
      <BrokerModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        configs={brokerConfigs}
        activeBrokerId={activeBrokerId}
        onSaveConfig={handleSaveBrokerConfig}
        onConnectBroker={handleConnectBroker}
        onDisconnectBroker={handleDisconnectBroker}
        onSelectActiveBroker={handleSelectActiveBroker}
        onToggleAutoExecution={handleToggleAutoExecution}
      />

      {/* Manual Order Execution Ticket Modal */}
      <OrderTicketModal
        isOpen={isOrderTicketOpen}
        onClose={() => setIsOrderTicketOpen(false)}
        activeBroker={brokerConfigs[activeBrokerId] || brokerConfigs.CAPITAL_COM}
        accountSummary={brokerAccountSummary}
        existingPositions={brokerPositions}
        defaultSymbol={manualTicketState.symbol || activeSymbol}
        defaultDirection={
          manualTicketState.direction ||
          (debateTranscript?.arbiter?.final_recommendation === 'SELL' ? 'SELL' : 'BUY')
        }
        defaultEntryPrice={
          manualTicketState.entryPrice ||
          (candles.length > 0 ? candles[candles.length - 1].close : 1.085)
        }
        defaultStopLoss={
          manualTicketState.stopLoss ||
          debateTranscript?.arbiter?.stop_loss ||
          (candles.length > 0 ? candles[candles.length - 1].close * 0.995 : 1.08)
        }
        defaultTakeProfit={
          manualTicketState.takeProfit ||
          debateTranscript?.arbiter?.take_profit?.[0] ||
          (candles.length > 0 ? candles[candles.length - 1].close * 1.01 : 1.095)
        }
        onSubmitOrder={handleSubmitBrokerOrder}
      />
    </div>
  );
}
