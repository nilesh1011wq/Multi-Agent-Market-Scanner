import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { marketDataService, WATCHLIST, fetchLiveMarketQuote, fetchAllLiveMarketQuotes } from './src/data/marketDataService';
import { getAllInstrumentMappings } from './src/broker/symbolMapper';
import { buildFeatureSnapshot, buildMultiTimeframeSnapshot } from './src/quant/snapshot';
import { queryHistoricalAnalogs } from './src/analogs/analogEngine';
import { getCOTData } from './src/analogs/cotEngine';
import { HISTORICAL_EVENTS } from './src/analogs/historicalEvents';
import { KB_COLLECTIONS, getAgentKBDocs } from './src/analogs/kbDocuments';
import { runQuantTests } from './src/quant/testFeatureEngine';
import { Timeframe } from './src/types/market';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // Enable CORS for hosted frontends (e.g. Netlify, Vercel, Cloud Run)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CAP-API-KEY, CST, X-SECURITY-TOKEN'
    );
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  app.get('/api/symbols', (_req, res) => {
    res.json({ success: true, watchlist: WATCHLIST });
  });

  // 1b. Real-time live market quotes for all 15 instruments
  app.get('/api/quotes', async (_req, res) => {
    try {
      const quotes = await fetchAllLiveMarketQuotes();
      res.json({ success: true, quotes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/quote', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'EURUSD';
      const quote = await fetchLiveMarketQuote(symbol);
      res.json({ success: true, quote });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1c. Master Broker Symbol Mapping for Capital.com, MT5, and IG Markets
  app.get('/api/broker/symbols-mapping', (_req, res) => {
    res.json({ success: true, instruments: getAllInstrumentMappings() });
  });

  // 2. Multi-timeframe candle data
  app.get('/api/candles', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'EURUSD';
      const timeframe = (req.query.timeframe as Timeframe) || 'H1';
      const count = parseInt(req.query.count as string, 10) || 120;

      const candles = await marketDataService.getCandles(symbol, timeframe, count);
      res.json({ success: true, symbol, timeframe, candles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Deterministic feature snapshot & 30-year historical analogs
  app.get('/api/snapshot', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'EURUSD';
      const timeframe = (req.query.timeframe as Timeframe) || 'H1';

      const candles = await marketDataService.getCandles(symbol, timeframe, 120);
      const snapshot = buildFeatureSnapshot(symbol, timeframe, candles);
      const analogs = queryHistoricalAnalogs(snapshot);
      const cot = getCOTData(symbol);

      res.json({
        success: true,
        snapshot,
        analogs,
        cot,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Multi-timeframe full snapshot (M15, H1, H4, D1, W1)
  app.get('/api/mtf-snapshot', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'EURUSD';
      const timeframes: Timeframe[] = ['M15', 'H1', 'H4', 'D1', 'W1'];
      const candleMap: Record<Timeframe, any> = {} as any;

      for (const tf of timeframes) {
        candleMap[tf] = await marketDataService.getCandles(symbol, tf, 100);
      }

      const mtfSnapshot = buildMultiTimeframeSnapshot(symbol, candleMap);
      const h1Snapshot = buildFeatureSnapshot(symbol, 'H1', candleMap.H1);
      const analogs = queryHistoricalAnalogs(h1Snapshot);
      const cot = getCOTData(symbol);

      res.json({
        success: true,
        mtfSnapshot,
        analogs,
        cot,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Economic Calendar & Blackout Windows
  app.get('/api/calendar', async (_req, res) => {
    try {
      const calendar = await marketDataService.getEconomicCalendar();
      res.json({ success: true, calendar });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. News & Sentiment feed
  app.get('/api/news', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'EURUSD';
      const news = await marketDataService.getNews(symbol);
      res.json({ success: true, news });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. 30-Year Event & Regime Library
  app.get('/api/historical-events', (_req, res) => {
    res.json({ success: true, events: HISTORICAL_EVENTS });
  });

  // 8. Curated Agent Knowledge Base collections
  app.get('/api/kb-docs', (req, res) => {
    const agent = req.query.agent as any;
    if (agent) {
      res.json({ success: true, docs: getAgentKBDocs(agent) });
    } else {
      res.json({ success: true, docs: KB_COLLECTIONS });
    }
  });

  // 9. Run automated Quant feature engine test suite
  app.post('/api/test-quant', (_req, res) => {
    try {
      const passed = runQuantTests();
      res.json({ success: true, passed, timestamp: Date.now() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Phase 2: Trend & Momentum Agent Single-Timeframe Execution
  app.post('/api/agent/trend', async (req, res) => {
    try {
      const symbol = (req.body.symbol as string) || 'EURUSD';
      const timeframe = (req.body.timeframe as Timeframe) || 'H1';

      const candles = await marketDataService.getCandles(symbol, timeframe, 120);
      const snapshot = buildFeatureSnapshot(symbol, timeframe, candles);
      const analogs = queryHistoricalAnalogs(snapshot);

      const { executeTrendAgent } = await import('./src/agents/trendAgent');
      const startTime = Date.now();
      const output = await executeTrendAgent({ snapshot, analogs });
      const durationMs = Date.now() - startTime;

      res.json({
        success: true,
        symbol,
        timeframe,
        durationMs,
        output,
        snapshot,
        analogs,
      });
    } catch (err: any) {
      console.error('[API /api/agent/trend] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Phase 3: Full 3-Round 10-Agent Debate & Arbiter Synthesis
  app.post('/api/debate/run', async (req, res) => {
    try {
      const symbol = (req.body.symbol as string) || 'EURUSD';
      const timeframe = (req.body.timeframe as Timeframe) || 'H1';

      const candles = await marketDataService.getCandles(symbol, timeframe, 120);
      const snapshot = buildFeatureSnapshot(symbol, timeframe, candles);
      const analogs = queryHistoricalAnalogs(snapshot);
      const cot = getCOTData(symbol);

      const { runFullDebate } = await import('./src/agents/debateOrchestrator');
      const { scorecardService } = await import('./src/backtest/scorecards');
      const agentScorecards = scorecardService.getScorecards(symbol, timeframe);

      const startTime = Date.now();
      const debateTranscript = await runFullDebate({
        snapshot,
        analogs,
        cot,
        agentScorecards,
      });
      const durationMs = Date.now() - startTime;

      // Automated Broker Execution trigger (if enabled on active broker)
      let autoTradeResult: any = null;
      try {
        const { brokerManager } = await import('./src/broker/brokerManager');
        autoTradeResult = await brokerManager.evaluateAndAutoExecute(
          debateTranscript.arbiter,
          snapshot
        );
      } catch (brokerErr: any) {
        console.warn('[Debate] Auto-trade dispatch warning:', brokerErr.message);
      }

      res.json({
        success: true,
        durationMs,
        debate: debateTranscript,
        autoTradeResult,
      });
    } catch (err: any) {
      console.error('[API /api/debate/run] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11b. Engine Status & Quota Health
  app.get('/api/engine/status', async (_req, res) => {
    try {
      const { quotaManager } = await import('./src/agents/quotaManager');
      res.json({
        success: true,
        ...quotaManager.getStatus(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. Phase 4: Scorecards & Walk-Forward Performance Tracking
  app.get('/api/scorecards', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'EURUSD';
      const timeframe = (req.query.timeframe as Timeframe) || 'H1';

      const { scorecardService } = await import('./src/backtest/scorecards');
      const scorecards = scorecardService.getScorecards(symbol, timeframe);
      const recommendations = scorecardService.getRecommendations();

      res.json({
        success: true,
        symbol,
        timeframe,
        scorecards,
        recommendations,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 13. Phase 4: Run Walk-Forward Backtest
  app.post('/api/backtest/run', async (req, res) => {
    try {
      const symbol = (req.body.symbol as string) || 'EURUSD';
      const timeframe = (req.body.timeframe as Timeframe) || 'H1';

      const { scorecardService } = await import('./src/backtest/scorecards');
      const startTime = Date.now();
      const updatedScorecards = scorecardService.runBacktest(symbol, timeframe);
      const durationMs = Date.now() - startTime;

      res.json({
        success: true,
        symbol,
        timeframe,
        durationMs,
        scorecards: updatedScorecards,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Phase 5: Multi-Asset Scanner & Ranked Opportunities
  app.get('/api/scanner/ranked-opportunities', async (_req, res) => {
    try {
      const { scannerService } = await import('./src/scheduler/scannerService');
      const opportunities = scannerService.getRankedOpportunities();
      const lastScanTime = scannerService.getLastScanTime();
      const isScanning = scannerService.getIsScanning();
      res.json({ success: true, opportunities, lastScanTime, isScanning });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/scanner/run-all', async (req, res) => {
    try {
      const timeframe = (req.body.timeframe as Timeframe) || 'H1';
      const { scannerService } = await import('./src/scheduler/scannerService');
      const startTime = Date.now();
      const opportunities = await scannerService.scanAll(timeframe);
      const durationMs = Date.now() - startTime;
      res.json({ success: true, timeframe, durationMs, opportunities });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 15. Phase 5: Alerts & Webhook Dispatcher
  app.get('/api/alerts/history', async (_req, res) => {
    try {
      const { alertService } = await import('./src/scheduler/alertService');
      res.json({ success: true, alerts: alertService.getHistory(), config: alertService.getConfig() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/alerts/config', async (req, res) => {
    try {
      const { alertService } = await import('./src/scheduler/alertService');
      const updated = alertService.updateConfig(req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/alerts/test', async (req, res) => {
    try {
      const symbol = (req.body.symbol as string) || 'EURUSD';
      const { alertService } = await import('./src/scheduler/alertService');
      const alert = await alertService.sendTestAlert(symbol);
      res.json({ success: true, alert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 16. Phase 6: Paper Trading Simulator & Bayesian Scorecard Feedback Loop
  app.get('/api/paper-trading/summary', async (_req, res) => {
    try {
      const { paperTrader } = await import('./src/backtest/paperTrader');
      res.json({
        success: true,
        summary: paperTrader.getAccountSummary(),
        openPositions: paperTrader.getOpenPositions(),
        closedPositions: paperTrader.getClosedPositions(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/paper-trading/open', async (req, res) => {
    try {
      const { opportunity, agentVotes } = req.body;
      const { paperTrader } = await import('./src/backtest/paperTrader');
      const position = paperTrader.openPositionFromOpportunity(opportunity, agentVotes);
      res.json({ success: true, position });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/paper-trading/simulate-tick', async (_req, res) => {
    try {
      const { paperTrader } = await import('./src/backtest/paperTrader');
      const result = await paperTrader.simulateMarketTick();
      res.json({
        success: true,
        ...result,
        summary: paperTrader.getAccountSummary(),
        openPositions: paperTrader.getOpenPositions(),
        closedPositions: paperTrader.getClosedPositions(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/paper-trading/close', async (req, res) => {
    try {
      const { id, reason } = req.body;
      const { paperTrader } = await import('./src/backtest/paperTrader');
      const position = paperTrader.closePosition(id, reason);
      res.json({
        success: true,
        position,
        summary: paperTrader.getAccountSummary(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 17. Multi-Broker Gateway (Capital.com, MT5, IG Markets)
  app.get('/api/broker/configs', async (_req, res) => {
    try {
      const { brokerVault } = await import('./src/broker/brokerVault');
      const configs = brokerVault.getSanitizedConfigs();
      const active = brokerVault.getActiveBroker();
      res.json({ success: true, configs, activeBrokerId: active.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/config', async (req, res) => {
    try {
      const { brokerId, config } = req.body;
      const { brokerVault } = await import('./src/broker/brokerVault');
      brokerVault.updateConfig(brokerId as any, config);
      const sanitized = brokerVault.getSanitizedConfigs();
      res.json({ success: true, config: sanitized[brokerId as keyof typeof sanitized] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/connect', async (req, res) => {
    try {
      const { brokerId } = req.body;
      const { brokerManager } = await import('./src/broker/brokerManager');
      const result = await brokerManager.connectBroker(brokerId);
      res.json({ ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/disconnect', async (req, res) => {
    try {
      const { brokerId } = req.body;
      const { brokerManager } = await import('./src/broker/brokerManager');
      const result = await brokerManager.disconnectBroker(brokerId);
      res.json({ ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/select-active', async (req, res) => {
    try {
      const { brokerId } = req.body;
      const { brokerVault } = await import('./src/broker/brokerVault');
      const { brokerManager } = await import('./src/broker/brokerManager');
      brokerVault.setActiveBroker(brokerId);
      await brokerManager.connectBroker(brokerId);
      res.json({ success: true, activeBrokerId: brokerId });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/toggle-auto-execution', async (req, res) => {
    try {
      const { enabled } = req.body;
      const { brokerVault } = await import('./src/broker/brokerVault');
      const active = brokerVault.getActiveBroker();
      brokerVault.updateConfig(active.id, { isAutoExecutionEnabled: !!enabled });
      res.json({ success: true, isAutoExecutionEnabled: !!enabled, brokerId: active.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/broker/account', async (_req, res) => {
    try {
      const { brokerManager } = await import('./src/broker/brokerManager');
      const [summary, positions, closedPositions] = await Promise.all([
        brokerManager.getActiveAccountSummary(),
        brokerManager.getActiveOpenPositions(),
        brokerManager.getActiveClosedPositions(),
      ]);
      res.json({ success: true, summary, positions, closedPositions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/sync-balance', async (_req, res) => {
    try {
      const { brokerManager } = await import('./src/broker/brokerManager');
      // Run breakeven check on open positions during sync
      await brokerManager.manageOpenPositionsBreakeven();
      const [summary, positions, closedPositions] = await Promise.all([
        brokerManager.getActiveAccountSummary(),
        brokerManager.getActiveOpenPositions(),
        brokerManager.getActiveClosedPositions(),
      ]);
      const logs = brokerManager.getAuditLogs();
      res.json({ success: true, summary, positions, closedPositions, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/broker/positions', async (_req, res) => {
    try {
      const { brokerManager } = await import('./src/broker/brokerManager');
      const positions = await brokerManager.getActiveOpenPositions();
      res.json({ success: true, positions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/broker/closed-positions', async (_req, res) => {
    try {
      const { brokerManager } = await import('./src/broker/brokerManager');
      const closedPositions = await brokerManager.getActiveClosedPositions();
      res.json({ success: true, closedPositions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/order', async (req, res) => {
    try {
      const { order } = req.body;
      const { brokerManager } = await import('./src/broker/brokerManager');
      const result = await brokerManager.executeManualOrder(order);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/breakeven', async (req, res) => {
    try {
      const { brokerId, ticketId } = req.body;
      const { brokerManager } = await import('./src/broker/brokerManager');
      const result = await brokerManager.movePositionToBreakeven(brokerId, ticketId);
      res.json({ ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/close', async (req, res) => {
    try {
      const { brokerId, ticketId } = req.body;
      const { brokerManager } = await import('./src/broker/brokerManager');
      const result = await brokerManager.closePosition(brokerId, ticketId);
      res.json({ ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/flatten-all', async (_req, res) => {
    try {
      const { brokerManager } = await import('./src/broker/brokerManager');
      const result = await brokerManager.flattenAllActive();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/broker/close-duplicates', async (req, res) => {
    try {
      const { brokerId } = req.body || {};
      const { brokerManager } = await import('./src/broker/brokerManager');
      const result = await brokerManager.closeDuplicatePositions(brokerId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/broker/audit-logs', async (_req, res) => {
    try {
      const { brokerManager } = await import('./src/broker/brokerManager');
      res.json({ success: true, logs: brokerManager.getAuditLogs() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middlewares for frontend SPA in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
  app.listen(port, () => {
    console.log(`[Quant Market Scanner] Server listening on port ${port}`);

    // ==========================================
    // 24/7 AUTONOMOUS BACKGROUND ENGINE
    // ==========================================
    console.log('[Quant Market Scanner] Starting 24/7 Autonomous Scanner & Market Engine...');

    // 1. Autonomous 15-Minute Market Scanner Loop
    const SCAN_INTERVAL_MS = 15 * 60 * 1000;
    setInterval(async () => {
      try {
        console.log(`[24/7 Scanner] Running scheduled scan across all 15 instruments at ${new Date().toISOString()}`);
        const { scannerService } = await import('./src/scheduler/scannerService');
        await scannerService.scanAll('H1');
        console.log('[24/7 Scanner] Scheduled scan completed successfully.');
      } catch (err: any) {
        console.error('[24/7 Scanner] Error during autonomous background scan:', err.message);
      }
    }, SCAN_INTERVAL_MS);

    // 2. Autonomous Broker Position Sync, Breakeven Manager & Paper Trading Loop (every 30 seconds)
    const TICK_INTERVAL_MS = 30 * 1000;
    setInterval(async () => {
      try {
        const { brokerManager } = await import('./src/broker/brokerManager');
        await brokerManager.manageOpenPositionsBreakeven();
        await brokerManager.getActiveAccountSummary();

        const { paperTrader } = await import('./src/backtest/paperTrader');
        const active = paperTrader.getOpenPositions();
        if (active.length > 0) {
          const res = await paperTrader.simulateMarketTick();
          if (res.resolved.length > 0) {
            console.log(
              `[24/7 Paper Trader] Resolved ${res.resolved.length} position(s):`,
              res.resolved.map((p) => `${p.symbol} ${p.status} (${p.realizedPnLR}R)`)
            );
          }
        }
      } catch (err: any) {
        // Silent catch for background tick drift
      }
    }, TICK_INTERVAL_MS);

    // Run an initial scan 10 seconds after boot
    setTimeout(async () => {
      try {
        console.log('[24/7 Scanner] Executing initial boot scan...');
        const { scannerService } = await import('./src/scheduler/scannerService');
        await scannerService.scanAll('H1');
        console.log('[24/7 Scanner] Initial boot scan completed.');
      } catch (err: any) {
        console.warn('[24/7 Scanner] Initial boot scan notice:', err.message);
      }
    }, 10000);
  });
}

startServer().catch((err) => {
  console.error('[Quant Market Scanner] Failed to start server:', err);
});

