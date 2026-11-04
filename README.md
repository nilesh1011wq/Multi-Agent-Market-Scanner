# Multi-Agent Market Scanner

> **Institutional-Quality Quantitative Scanner & 10-Agent Debate System for Forex and Commodities**  
> *Deterministic Feature Extraction · 30-Year Historical Knowledge Base · 10 Specialist AI Agents · Chief Arbiter Synthesis · Walk-Forward Backtesting · Forward Paper-Trading Simulator*

---

## 1. Overview & Core Philosophy

The **Multi-Agent Market Scanner** scans a configurable 12-instrument watchlist across 5 timeframes (`M15`, `H1`, `H4`, `D1`, `W1`) and produces high-conviction trade recommendations through a judicial debate between **10 domain-specialist AI agents** and **1 Chief Arbiter**.

### Strict Operational Principles:
1. **Zero Auto-Execution**: Strictly produces algorithmic trade recommendations and simulates forward paper portfolios. No real capital execution or broker APIs.
2. **Deterministic Feature Engine (NO LLM)**: All technical indicators, pivot levels, swing extrema, break of structure (BOS), candlestick patterns, and regime classifications are computed in pure TypeScript/Python code. Agents receive compact, verified JSON snapshots—never raw candle arrays or hallucinated numbers.
3. **Evidence Quality Gating ($N \ge 30$)**: Analog engine returns statistical distributions from 30 years of macroeconomic and market shocks (1996–2026). If sample size $N < 30$, the system enforces "insufficient evidence" and agents are prohibited from citing statistics.
4. **Hard Risk Gatekeeper**: If Agent 10 (Risk Manager) issues a `VETO` ($R:R < 1.5$, stop $> 3$ ATR, untradable market chop, or high-impact economic news blackout), the Chief Arbiter **cannot override**—the recommendation is strictly gated to `NO_TRADE`.
5. **Anti-Bias Discipline**: Backtesting strictly evaluates deterministic code signals. LLMs are never evaluated on historical data because language models have historical price outcomes in their training corpora. LLM performance is evaluated strictly on forward-test paper trading data with dynamic Bayesian weight updates.

---

## 2. Watchlist & Multi-Timeframe Coverage

### Assets (12 Core Instruments)
- **Forex Majors & Comms**: `EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `USDCAD`, `USDCHF`, `NZDUSD`
- **Precious Metals**: `XAUUSD` (Gold), `XAGUSD` (Silver)
- **Energy Commodities**: `WTI` (Crude Oil), `BRENT` (Brent Crude), `NATGAS` (Natural Gas)

### Timeframes
- **W1 / D1**: Macro regime, structural trend alignment, and long-term liquidity levels.
- **H4 / H1**: Setup horizon, pivot clusters, and intermarket confluences.
- **M15**: Execution zone, inside bar/pin bar triggers, and stop loss precision.

---

## 3. The 10 Specialist Agents & The Chief Arbiter

| # | Specialist Agent | Domain & Deterministic Inputs | System Mandate |
|---|------------------|-------------------------------|----------------|
| **1** | **Trend & Momentum** | EMA 20/50/200 stacks, ADX (14), MACD (12,26,9), MTF alignment | Identifies persistent directional flow; guards against counter-trend fade. |
| **2** | **Mean Reversion** | Wilder RSI (14), Stochastic (14,3,3), Bollinger Bands (%B, Bandwidth) | Spots statistical exhaustion in range regimes; demands strict overextension. |
| **3** | **Price Action & S/R** | Classic Pivots (PP, R1-3, S1-3), Engulfing/Pin/Inside bars, S/R cluster touch counts | Evaluates horizontal barriers, false breakouts, and wick rejections. |
| **4** | **Volatility & Regime** | ATR (14), 1Y/10Y Volatility percentiles, 6-factor regime classifier | **Tradability Gatekeeper**: Flags dead chop or volatility spikes as untradable. |
| **5** | **Market Structure & Volume** | Swing highs/lows, BOS, CHoCH, Buy/Sell-side liquidity sweeps | Traces institutional liquidity pools and structural trend shifts. |
| **6** | **Macro & Fundamental** | FRED 10Y Yields, Fed Funds, CPI, DXY, Central Bank stance | Contextualizes policy divergence and macroeconomic tailwinds. |
| **7** | **News & Sentiment** | Economic calendar, Event risk, News headlines, ±30m Blackout windows | Enforces blackout rules ahead of high-impact NFP, CPI, and FOMC releases. |
| **8** | **Intermarket** | Cross-asset correlations: DXY, US10Y, Gold/Oil ratios, Equity risk-on/off | Validates setups against global macro capital flows and yield differentials. |
| **9** | **Positioning & Seasonality** | CFTC COT 30-Year Percentiles (Commercial vs Non-Commercial), Seasonality | Detects commercial hedging extremes and crowding risks. |
| **10** | **Risk Manager** | Portfolio risk (1%), ATR stop distance ($\le 3.0$), R:R gate ($\ge 1.5$) | **Absolute Veto Authority**: Overrides debate if risk parameters fail. |
| **👑** | **Chief Arbiter** | Judicial review of Round 1 votes, Round 2 cross-exam, and Bayesian weights | Delivers multi-timeframe trade recommendations and Evidence Badges. |

---

## 4. 3-Round Debate Architecture

```
┌────────────────────────────────────────────────────────┐
│     Deterministic Feature Engine & Analog Retrieval    │
│  (EMA, MACD, RSI, ADX, ATR, Pivots, COT, 30-Yr Events)  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  ROUND 1: Independent Specialist Analyses (Parallel)   │
│  - 10 Specialist Agents produce strict JSON outputs     │
│  - Strict Evidence Gating: sample size N ≥ 30 required │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  ROUND 2: Cross-Examination Matrix                     │
│  - Each agent reviews the remaining 9 outputs          │
│  - Cites: disagrees_with, convinced_by, and revised     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  ROUND 3: Chief Arbiter Synthesis                      │
│  - Evaluates consensus, timeframe alignment, & weights │
│  - Checks Risk Manager VETO (Hard Gate)                │
│  - Outputs BUY / SELL / NO TRADE with entry, SL, TPs   │
│  - Assigns Evidence Quality Badge: [A], [B], or [C]    │
└────────────────────────────────────────────────────────┘
```

---

## 5. Walk-Forward Backtesting & Bayesian Weighting

- **Walk-Forward Validation**: 70% In-Sample / 30% Out-of-Sample split to verify algorithmic signals.
- **Dynamic Bayesian Weights**:
  $$\text{Weight} = \left(\frac{\text{OOS Hit Rate}}{0.50}\right) \times \left(1 + \text{clamp}(\text{Avg R} \times 0.15, -0.4, 0.4)\right)$$
- **Unproven Sample Cap**: Any agent with fewer than 30 resolved trades has their voting influence capped at $0.7\times$.

---

## 6. Forward Paper-Trading Simulator

- **Virtual Portfolio**: $10,000 starting equity with strict 1.0% risk per trade.
- **Two-Target Scaling**:
  - **Target 1**: Locks in $+1.0\text{R}$ on 50% size and shifts stop loss to breakeven.
  - **Target 2**: Captures runner target at $\ge 2.0\text{R}$.
- **Live Bayesian Feedback Loop**: When a paper trade resolves (`WIN` or `LOSS`), the outcome feeds into the scorecard service, immediately recalibrating the specialist agents' credibility weights based on how they voted!

---

## 7. Quickstart & Deployment

### Development Mode (Node 22 / Vite)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional Gemini/Claude API key)
cp .env.example .env

# 3. Start fullstack dev server (port 3000)
npm run dev
```

### Production Mode (Docker Compose)
```bash
docker compose up --build
```
This starts:
- `backend`: FastAPI / Node quant services
- `timescaledb`: PostgreSQL with TimescaleDB extension
- `redis`: Task queue & candle cache
- `frontend`: Next.js / React terminal UI on port 3000

---

## 8. Automated Test Suites

All 5 core sub-engines include automated verification scripts:
```bash
# Test 1: Deterministic Feature Engine & Analogs (10/10 tests)
npx tsx src/quant/testFeatureEngine.ts

# Test 2: Trend & Momentum Agent Execution
npx tsx src/agents/testTrendAgent.ts

# Test 3: Full 10-Agent 3-Round Debate & Risk Veto
npx tsx src/agents/testDebateOrchestrator.ts

# Test 4: Walk-Forward Backtest & Bayesian Weights
npx tsx src/backtest/testBacktestHarness.ts

# Test 5: Multi-Asset Scanner, Alerts & Paper Trader
npx tsx src/scheduler/testScanner.ts
```

---

## 9. Disclaimer
This application is strictly for quantitative market analysis, research, and educational demonstration. It produces algorithmic recommendations and simulates paper trades. It does not provide financial advice and does not execute real-money orders.
