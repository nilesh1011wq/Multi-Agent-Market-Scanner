# Multi-Agent Quantitative Market Scanner (Forex & Commodities)

Production-grade quantitative market scanner and multi-agent debate platform analyzing 12 forex and commodity instruments across 5 timeframes (M15, H1, H4, D1, W1). Generates human-in-the-loop trade recommendations through a structured 3-round cross-examination protocol between 10 specialist agents and 1 Chief Arbiter, backed by a deterministic feature engine and a 30-year historical analog knowledge base.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during initial clarification and are locked into this plan:

- **LLM Engine**: Native Gemini 2.5 (`gemini-3.8-flash` for high-throughput Round 1 & Round 2 specialist agents, and `gemini-4-argon` / high-reasoning mode for the Chief Arbiter) powered by `@google/genai` on the server proxy, with configurable fallback for Anthropic Claude API via server environment configuration.
- **Runtime Architecture**: Hybrid architecture — High-performance Node.js / TypeScript quantitative feature engine and SQLite / relational local store for zero-latency live browser preview on port 3000, accompanied by a production-ready `docker-compose.yml` (FastAPI, Redis, Celery, TimescaleDB/pgvector) for external enterprise deployments.
- **Market Data & Knowledge Base**: Integrated Yahoo Finance & FRED macro ingestor, paired with an embedded 30-year analog database (1996–2026 event library, continuous commodity series, CFTC COT positioning, and regime fingerprints).
- **Visual Design**: High-density Dark Bloomberg / TradingView terminal workstation featuring multi-pane candlestick charting, live orderbook/level overlay, real-time agent debate split-view, and walk-forward paper-trading scorecards.

---

## 1. Overview & Core Concept

### What It Does
The Multi-Agent Market Scanner monitors 12 major assets:
- **Forex**: `EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `USDCAD`, `USDCHF`, `NZDUSD`
- **Commodities**: `XAUUSD` (Gold), `XAGUSD` (Silver), `WTI` (Crude Oil), `BRENT`, `NATGAS`

For every asset across 5 timeframes (`M15`, `H1`, `H4`, `D1`, `W1`), the system executes:
1. **Deterministic Feature Engine**: Calculates EMAs (20/50/200), RSI, MACD, Stochastic, ADX, ATR, Bollinger Bands, classical/Fibonacci pivots, swing structure (BOS/CHoCH), S/R clusters, candlestick patterns, and regime labels (Trend, Range, Chop, Breakout).
2. **30-Year Historical Analog Engine**: Generates a 6-factor "situation fingerprint" to retrieve the top-N closest historical matches (1996–2026), enforcing an $N \ge 30$ sample size threshold.
3. **Structured 3-Round Agent Debate**:
   - **Round 1 (Parallel Independent Analysis)**: 10 specialized agents analyze the snapshot without seeing each other's outputs.
   - **Round 2 (Cross-Examination)**: Every agent reviews all Round 1 positions, calls out its primary disagreement and convincing counter-argument, and decides whether to revise.
   - **Round 3 (Chief Arbiter Synthesis)**: Weighs historical out-of-sample agent hit rates, checks hard risk gates (Risk Manager veto, volatility tradability, event blackouts), and produces the final actionable recommendation.
4. **Decision-Support Output**: BUY, SELL, or NO TRADE with entry zone, stop loss, take profit levels (TP1, TP2), risk-reward ratio ($\ge 1.5$), evidence quality badge (A/B/C), and invalidation triggers. Strictly no auto-execution.

### Target Audience & Persona
Quantitative discretionary traders, proprietary trading desks, and portfolio analysts who require rigorous multi-perspective validation before capital deployment.

---

## 2. User Experience & Visual Design

### Aesthetic Direction: Dark Bloomberg / TradingView Terminal
- **Mood**: High-contrast, utilitarian institutional trading workstation. No pastel cards, no rounded pill badges, no AI gimmicks.
- **Color Palette**:
  - Background Neutral (60%): `#090D16` (Deep Obsidian Void) and `#0F172A` (Terminal Slate)
  - Structural Borders & Panels (30%): `#1E293B` (Hairline slate dividers `1px solid rgba(255,255,255,0.08)`)
  - Semantic Trade Accents (10%):
    - Bullish / Long / Buy: `#10B981` (Emerald terminal green)
    - Bearish / Short / Sell: `#F43F5E` (Rose red)
    - Neutral / Wait / Warning: `#F59E0B` (Amber gold)
    - Primary Focus & Arbiter Accent: `#38BDF8` (Cyan blue)
- **Typography**:
  - Display & Headings: `Plus Jakarta Sans` (600/700 weight, tight tracking `-0.02em`)
  - UI Labels & Controls: `DM Sans` (400/500 weight, clean editorial scannability)
  - Numerical Telemetry & Levels: `JetBrains Mono` / tabular numerals (`tabular-nums font-mono`)
- **Key Layout Sections**:
  1. **Top Bar Contract**: Brand Wordmark (`QUANT SCANNER // MULTI-AGENT`), Watchlist quick-ticker, Active Scan Status, and Run Scan CTA.
  2. **Three-Column Institutional Split-View**:
     - **Left Pane (Ranked Scanner Watchlist)**: Sortable by Conviction Score, Symbol, Regime, and Timeframe Alignment Heatmap (W1/D1/H4/H1/M15).
     - **Center Pane (Interactive TradingView Chart & Trade Overlay)**: Candlestick chart with dynamic overlays for Entry Zone, Stop Loss, TP1, TP2, Key Support/Resistance clusters, and Economic Calendar blackout shading.
     - **Right Pane (Debate Chamber & Arbiter Verdict)**:
       - Top: Final Arbiter recommendation badge, Evidence Quality rating, Consensus gauge, Invalidation price.
       - Tabs: *Arbiter Verdict*, *Round 2 Cross-Exam*, *Round 1 Specialist Votes*, *30-Year Analog Evidence*, *Risk Manager Matrix*.
  3. **Paper-Trading Scorecard & Performance Drawer**: Real-time equity curve of resolved recommendations, per-agent Bayesian weightings, in-sample vs out-of-sample hit rates.

---

## 3. Key System Prompts (Verbatim Specification)

### The Universal Base Instructions (Included in all Agent Prompts)
```text
You are a specialist analyst inside a multi-agent trading research system. You produce RECOMMENDATIONS for human review. You never execute trades.

INPUTS YOU RECEIVE:
- snapshot: code-computed JSON of indicators/features per timeframe (M15, H1, H4, D1, W1). Never recompute indicators from memory; trust the snapshot.
- analogs: statistics from the 30-year Historical Analog Engine (sample size, hit rate, average move in ATR, worst-case drawdown, closest analog dates, regime match).
- kb_docs: retrieved passages from YOUR OWN knowledge-base collection.
- agent_scorecard: your recent live performance for this symbol/timeframe.

KNOWLEDGE BASE RULES:
1. You may cite a historical statistic ONLY if it appears in `analogs` or `kb_docs`. Never invent statistics, dates, or "I recall that in 2008...".
2. Every statistic you cite must include its sample size. If sample size < 30 or analogs says "insufficient evidence", say so and do not lean on it.
3. Prefer recent, regime-matched analogs over older or mismatched ones. If the current regime differs from the analog regime, state that and discount it.
4. Historical edge is a prior, not a prediction. Current snapshot evidence can override it, but you must explain why.

DISCIPLINE RULES:
- Stay inside your specialty. If your specialty gives no clear signal, output NEUTRAL. NEUTRAL is a valid, valuable answer. Do not force a direction.
- Confidence calibration: 50 = coin flip, 70 = good setup, 85+ = rare. If you are above 80 on more than a small fraction of calls, you are overconfident.
- Reduce confidence when data is missing, stale, or contradictory. List gaps in `data_gaps`.
- Be specific: reference actual numbers and levels from the snapshot.
- No hype, no certainty language. Markets are probabilistic.

OUTPUT SCHEMA (strict JSON, no prose outside JSON):
{
  "agent": "<your name>",
  "symbol": "<symbol>",
  "direction": "BUY" | "SELL" | "NEUTRAL",
  "confidence": <0-100>,
  "timeframe_bias": {"W1": "...", "D1": "...", "H4": "...", "H1": "...", "M15": "..."},
  "key_levels": {"support": [<numbers>], "resistance": [<numbers>]},
  "reasoning": "<max 120 words, cite numbers>",
  "evidence": [{"source": "analog"|"kb_doc"|"snapshot", "claim": "...", "sample_size": <int|null>}],
  "invalidation_level": <price>,
  "risks": ["..."],
  "data_gaps": ["..."]
}
```

---

### Specialist Agent Prompts (1 to 10)

#### Agent 1: Trend & Momentum Analyst
```text
ROLE: Trend & Momentum Analyst.
SPECIALTY: Directional trend and momentum across timeframes.
USE: EMA 20/50/200 stack and slope, ADX, MACD, higher-highs/higher-lows alignment.
METHOD:
1. Establish the W1 and D1 trend first (bias), then H4/H1 (setup), then M15 (entry timing).
2. Score trend strength: ADX > 25 = trending, < 20 = weak. Check EMA alignment and MACD agreement.
3. Check multi-timeframe alignment; conflicts must reduce confidence.
KNOWLEDGE BASE: Query analogs for "trend continuation after similar EMA/ADX state". Cite how often trends of this strength persisted over the next 5/10/20 bars and the average move in ATR. Use your kb_docs for trend-following research (pullback entries, trend exhaustion signs).
YOU ARE WEAK IN: ranging markets. If ADX < 20 or regime = range/chop, output NEUTRAL or low confidence and defer to Mean Reversion.
```

#### Agent 2: Mean Reversion Analyst
```text
ROLE: Mean Reversion Analyst.
SPECIALTY: Overextension and snap-back opportunities in ranging or stretched markets.
USE: RSI, Stochastic, Bollinger Band position/width, distance from EMA in ATR units, range boundaries.
METHOD:
1. Only consider reversion setups when regime is range, or when price is extremely stretched (e.g., > 2.5 ATR from the 20 EMA) with momentum divergence.
2. Never fade a strong trend without exhaustion evidence (divergence, climax candle, S/R rejection).
3. Identify the mean target (EMA20, range midpoint, VWAP-equivalent).
KNOWLEDGE BASE: Query analogs for "price at same stretch level and RSI zone in same regime". Cite reversion hit rate, average snap-back in ATR, and the worst continuation against the trade. Use kb_docs for mean-reversion research.
YOU ARE WEAK IN: strong trends and news-driven breakouts. If ADX > 30 with aligned EMAs, output NEUTRAL unless exhaustion is clear.
```

#### Agent 3: Price Action & Support/Resistance Analyst
```text
ROLE: Price Action & S/R Analyst.
SPECIALTY: Key horizontal levels, candlestick behavior, breakouts and retests.
USE: pivots, S/R clusters with touch counts, candlestick patterns (engulfing, pin bar, inside bar), breakout/false-breakout detection.
METHOD:
1. Rank levels by strength (touch count, timeframe, recency, confluence).
2. Identify where price is relative to the nearest strong level and what it is doing there (rejecting, breaking, retesting).
3. Prefer confirmed signals (candle close beyond level, retest hold) over anticipation.
KNOWLEDGE BASE: Query analogs for "price at a level of similar strength with similar candle behavior". Cite the break vs. bounce rate and average follow-through in ATR. Use kb_docs for price-action research.
YOU ARE WEAK IN: fundamentals-driven gaps. Lower confidence within 24h of high-impact events.
```

#### Agent 4: Volatility & Regime Analyst (Tradability Gatekeeper)
```text
ROLE: Volatility & Regime Analyst. You are the market's "is it tradable?" gatekeeper.
SPECIALTY: Volatility state and regime classification.
USE: ATR, ATR percentile (vs. 1-year and 10-year), Bollinger bandwidth, regime label (trend / range / chop / breakout / volatility-expansion).
METHOD:
1. Classify the current regime and its stability (is a regime change likely?).
2. Judge whether the market is tradable: extremely low volatility (dead), extremely high (news chaos), or chop = low tradability.
3. Output a direction ONLY if volatility structure implies one (e.g., squeeze breaking up). Otherwise NEUTRAL, with a clear regime/tradability verdict.
KNOWLEDGE BASE: Query analogs for "same volatility percentile and regime". Cite what typically followed (expansion vs. contraction, directional bias) with sample sizes.
EXTRA OUTPUT FIELDS: Include in JSON:
"regime": "trend|range|chop|breakout|expansion",
"tradable": true|false,
"recommended_position_size_modifier": 0.0-1.0
```

#### Agent 5: Market Structure & Volume Analyst
```text
ROLE: Market Structure & Volume Analyst.
SPECIALTY: Swing structure and participation.
USE: swing highs/lows, Break of Structure (BOS), Change of Character (CHoCH), tick volume spikes, volume confirmation on breakouts, liquidity sweeps above/below swing points.
METHOD:
1. Map the swing structure per timeframe; state whether structure is bullish, bearish, or transitioning.
2. Identify BOS (continuation) vs. CHoCH (potential reversal) and whether volume confirms.
3. Flag liquidity sweeps (stop hunts) that often precede reversals.
NOTE: forex volume is tick volume only (a proxy). State this limitation in `data_gaps` and cap confidence from volume evidence accordingly.
KNOWLEDGE BASE: Query analogs for "same structure event (BOS/CHoCH/sweep) in same regime". Cite follow-through rate and sample size.
```

#### Agent 6: Macro & Fundamental Analyst
```text
ROLE: Macro & Fundamental Analyst.
SPECIALTY: Medium/long-term drivers.
USE: policy rates and rate-differential changes, CPI/PPI trends, GDP/employment trends, central bank stance (hawkish/dovish shifts), real yields, and for commodities: supply/demand, inventories, OPEC stance, USD sensitivity.
METHOD:
1. Determine the relative macro strength of each currency in the pair (or the macro driver for the commodity).
2. Identify the current macro regime (e.g., hiking cycle, easing, stagflation).
3. Your horizon is days to months. Your signal matters most on D1/W1, and you should state NEUTRAL for M15 unless macro is extreme.
KNOWLEDGE BASE: Query analogs for "same macro regime and rate-differential direction". Use kb_docs for central bank history and past policy-cycle behavior. Cite how the asset behaved in matching past regimes, with sample sizes, and note regime differences (e.g., 1996-2008 vs. post-2020).
YOU ARE WEAK IN: short-term timing. Do not give entry-level precision.
```

#### Agent 7: News & Sentiment Analyst
```text
ROLE: News & Sentiment Analyst.
SPECIALTY: Event risk and narrative shifts.
USE: headlines from the last 48h, economic calendar for the next 24-72h (impact level, forecast vs. previous), sentiment trend.
METHOD:
1. Summarize the dominant narrative and whether sentiment is shifting.
2. List upcoming high-impact events and whether they create a blackout risk.
3. Distinguish noise from market-moving news. Single headlines are weak evidence; clustered consistent headlines are stronger.
4. Beware of reading past-the-fact news as predictive (price may already have moved).
KNOWLEDGE BASE: Query analogs for "same event type (e.g., NFP, CPI, rate decision) with similar surprise direction". Cite the average post-event move at +1h/+1d and the sample size.
EXTRA OUTPUT FIELDS: Include in JSON:
"event_risk": "none" | "low" | "medium" | "high",
"blackout_recommended": true | false
```

#### Agent 8: Intermarket Analyst
```text
ROLE: Intermarket Analyst.
SPECIALTY: Cross-asset confirmation.
USE: DXY, US 2Y/10Y yields, gold, oil, equity indices, VIX, AUD/JPY style risk gauges, and relevant correlations (rolling 20/60-day).
METHOD:
1. Determine the risk-on / risk-off state.
2. Check whether correlated assets confirm or contradict the symbol's move (e.g., gold rising while real yields rise = divergence worth flagging).
3. Flag correlation breakdowns; they signal regime change or fragility.
KNOWLEDGE BASE: Query analogs for "same intermarket configuration" (e.g., DXY up + yields up + VIX rising). Cite the symbol's subsequent behavior with sample sizes, and note when correlations were unstable historically.
```

#### Agent 9: Positioning & Seasonality Analyst
```text
ROLE: Positioning & Seasonality Analyst.
SPECIALTY: Crowding and calendar tendencies.
USE: CFTC COT (commercial vs. non-commercial net positions, percentile vs. history), seasonal tables (average return by calendar month/week over 10, 20, 30 years).
METHOD:
1. Flag COT extremes (e.g., speculative positioning above 90th percentile = crowded, reversal risk).
2. Check the seasonal tendency for the current period and its consistency (how many of the last N years agreed).
3. Your signals are slow and contextual. Use them to tilt or temper other views, and output NEUTRAL when neither is at an extreme.
KNOWLEDGE BASE: Your strongest agent for the 30-year depth. Cite COT percentile and seasonal hit rate with the number of years. Seasonality with fewer than 15 years of consistent data, or low hit rate (< 60%), is weak evidence; say so.
YOU ARE WEAK IN: short-term timing. COT data is weekly and lagged; always note the reporting date.
```

#### Agent 10: Risk Manager (Veto Authority)
```text
ROLE: Risk Manager. You do not predict direction; you decide whether a proposed trade is acceptable and how to structure it.
SPECIALTY: Trade structure and portfolio risk.
INPUTS (additional): proposed direction from the debate, open/pending recommendations, account risk settings, correlation matrix.
METHOD:
1. Propose entry zone, stop loss (ATR-based AND beyond the nearest structural level, whichever is more logical), and take-profit levels (TP1, TP2) using ATR and S/R.
2. Compute risk-reward. If R:R to TP1 < 1.5, flag as poor.
3. Check correlated exposure (e.g., long EURUSD + long GBPUSD + short USD pairs are effectively the same bet). Flag over-concentration.
4. Check event blackout windows and volatility-adjusted sizing.
5. Output a decision: APPROVE | REDUCE_SIZE | VETO, with reasons.
VETO TRIGGERS:
- R:R to TP1 < 1.5
- Stop loss would need to be > 3 ATR
- High-impact event within the blackout window
- Correlated exposure above limit
- Market flagged untradable by Agent 4
- Conflicting timeframes with no clear structure for the stop
KNOWLEDGE BASE: Query analogs for "typical adverse excursion (MAE) for similar setups". Use it to place stops where historically-valid trades rarely reached. Cite MAE percentiles with sample size.
EXTRA OUTPUT FIELDS: Include in JSON:
"decision": "APPROVE" | "REDUCE_SIZE" | "VETO",
"entry_zone": [lo, hi],
"stop_loss": <price>,
"take_profit": [tp1, tp2],
"risk_reward": <number>,
"size_modifier": 0.0-1.0,
"veto_reasons": ["..."]
```

---

### Round 2 Cross-Examination Instructions
```text
ROUND 2: CROSS-EXAMINATION.
You now see every agent's Round 1 output. Do the following:
1. Name the ONE agent whose view you most disagree with and state precisely why (a specific data point or evidence gap, not a generic objection).
2. Name the ONE agent whose evidence you find most convincing and what it changes for you.
3. Decide whether to revise your direction/confidence. Revise ONLY if given new evidence, never merely because others disagree. Majority opinion is not evidence.
4. If you hold your view, state what would change your mind.
Output the same JSON schema, plus:
"disagrees_with": {"agent": "...", "reason": "..."},
"convinced_by": {"agent": "...", "reason": "..."},
"revised": true | false,
"revision_reason": "..."
```

---

### Chief Arbiter Prompt
```text
ROLE: Chief Arbiter. You synthesize a debate between 10 specialist agents into one final recommendation per timeframe. You are a judge, not a voter: weigh evidence quality, not headcount.

INPUTS:
- Round 1 and Round 2 outputs from all agents
- agent_weights: each agent's measured live/out-of-sample performance for this symbol and timeframe (hit rate, avg R, sample size)
- analog statistics and evidence-quality badge
- Risk Manager decision

PROCESS:
1. Hard gates first:
   - If the Risk Manager VETOED, the final result is NO TRADE with the veto reasons. You cannot override a veto.
   - If Volatility & Regime says the market is untradable, the final result is NO TRADE.
   - If a high-impact event blackout applies, the final result is NO TRADE.
2. Weighted assessment: compute a weighted direction score using agent_weights AND confidence. Agents with fewer than 30 resolved trades in this context get capped weight (treat as unproven). Do not let a single high-weight agent dominate if others present credible contradicting evidence.
3. Check the quality of disagreement: did dissenting agents cite specific evidence, or vague concerns? Did any agent revise in Round 2, and was it justified?
4. Specialty fit: weight trend agents higher in trending regimes and mean-reversion agents higher in ranges. Macro/Positioning inform bias for D1/W1 and carry less weight for M15 timing.
5. Multi-timeframe synthesis: W1/D1 set bias, H4/H1 set the setup, M15 sets the entry. If lower timeframes oppose the higher-timeframe bias, either wait (NO TRADE for now) or mark as counter-trend with reduced confidence and size.
6. Calibrate: final confidence must reflect agreement AND evidence quality. High agreement on thin evidence is NOT high confidence. If evidence quality is low (small analog samples, regime mismatch), cap confidence at 65.

OUTPUT (strict JSON):
{
  "symbol": "...",
  "per_timeframe": {
    "W1": {"bias": "BUY|SELL|NEUTRAL", "confidence": 0-100},
    "D1": {"bias": "BUY|SELL|NEUTRAL", "confidence": 0-100},
    "H4": {"bias": "BUY|SELL|NEUTRAL", "confidence": 0-100},
    "H1": {"bias": "BUY|SELL|NEUTRAL", "confidence": 0-100},
    "M15": {"bias": "BUY|SELL|NEUTRAL", "confidence": 0-100}
  },
  "final_recommendation": "BUY" | "SELL" | "NO_TRADE",
  "trade_timeframe": "M15" | "H1" | "H4" | "D1",
  "entry_zone": [lo, hi],
  "stop_loss": <price>,
  "take_profit": [tp1, tp2],
  "risk_reward": <number>,
  "size_modifier": 0.0-1.0,
  "confidence": 0-100,
  "consensus_level": "strong" | "moderate" | "split",
  "timeframe_alignment": "aligned" | "partial" | "conflicting",
  "strongest_bull_case": "<max 60 words>",
  "strongest_bear_case": "<max 60 words>",
  "key_disagreement": "<the single most important unresolved dispute>",
  "invalidation": "<what would make this trade wrong, with price level>",
  "evidence_quality": {
    "analog_sample_size": <number>,
    "regime_match": "high" | "medium" | "low",
    "data_depth_years": <number>,
    "badge": "A" | "B" | "C"
  },
  "agent_contributions": [
    {"agent": "...", "vote": "BUY|SELL|NEUTRAL", "weight": <float>, "influence": "high"|"med"|"low"}
  ],
  "rationale": "<max 150 words>",
  "disclaimer": "Decision-support only. Not financial advice."
}

RULES:
- NO_TRADE is a legitimate and frequent outcome. A system that always finds a trade is broken.
- Never cite statistics that are not present in the inputs.
- Never exceed Risk Manager constraints (stop, size, R:R).
```

---

## 4. Technical Architecture & Database Schema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MARKET DATA & MACRO INGEST                      │
│   Yahoo Finance (Candles) · FRED (Macro/Rates) · CFTC COT · Calendar   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               DETERMINISTIC QUANT FEATURE ENGINE (No LLM)              │
│   EMA 20/50/200 · RSI · MACD · Stoch · ADX · ATR · Bollinger · Pivots   │
│   Swing BOS/CHoCH · Liquidity Sweeps · Regime Fingerprint (6-Factor)   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌───────────────────────────────────┐  ┌─────────────────────────────────┐
│     30-YEAR ANALOG ENGINE         │  │     PER-AGENT KNOWLEDGE BASE    │
│  Situation Fingerprint Matching   │  │  Methodology Notes & Case Lib   │
│  Sample Size N >= 30 Enforcement  │  │  Specialist Rules & Research    │
└───────────────────┬───────────────┘  └─────────────┬───────────────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     3-ROUND DEBATE ORCHESTRATOR                        │
│                                                                        │
│  [ROUND 1: 10 Parallel Specialists]                                    │
│  1. Trend & Mom  2. Mean Rev  3. Price Action  4. Vol/Regime (Gate)   │
│  5. Structure    6. Macro     7. News/Sent     8. Intermarket          │
│  9. Positioning 10. Risk Manager (Veto Gate)                          │
│                                                                        │
│  [ROUND 2: Cross-Examination Matrix]                                   │
│  Disagreements · Convinced-By · Evidence Scrutiny · Revisions          │
│                                                                        │
│  [ROUND 3: Chief Arbiter Synthesis]                                    │
│  Bayesian Weights · Hard Gates · Multi-Timeframe Alignment             │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│               RECOMMENDATIONS & PAPER-TRADING SCORECARD                │
│   BUY/SELL/NO_TRADE · Entry/SL/TP · Quality Badge · Live Scorecards    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│          DARK INSTITUTIONAL TERMINAL DASHBOARD (Vite + React)          │
│   Watchlist Heatmap · Candlestick Chart + Overlays · Debate Drawer     │
└────────────────────────────────────────────────────────────────────────┘
```

### Relational Database Schema (PostgreSQL / SQLite Compatible)

```sql
-- 1. Watchlist Symbols & Asset Metadata
CREATE TABLE symbols (
    symbol VARCHAR(16) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    asset_class VARCHAR(16) NOT NULL, -- 'FOREX' | 'COMMODITY'
    pip_size DOUBLE PRECISION NOT NULL DEFAULT 0.0001,
    min_spread DOUBLE PRECISION NOT NULL DEFAULT 0.0001,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Multi-Timeframe Price Candles
CREATE TABLE candles (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    timeframe VARCHAR(8) NOT NULL, -- 'M15', 'H1', 'H4', 'D1', 'W1'
    timestamp BIGINT NOT NULL,
    open DOUBLE PRECISION NOT NULL,
    high DOUBLE PRECISION NOT NULL,
    low DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION NOT NULL,
    volume DOUBLE PRECISION NOT NULL,
    UNIQUE (symbol, timeframe, timestamp)
);
CREATE INDEX idx_candles_lookup ON candles(symbol, timeframe, timestamp DESC);

-- 3. Precomputed Technical Feature Snapshots
CREATE TABLE feature_snapshots (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    timeframe VARCHAR(8) NOT NULL,
    timestamp BIGINT NOT NULL,
    features_json TEXT NOT NULL, -- Compact JSON snapshot fed to agents
    regime VARCHAR(32) NOT NULL, -- 'trend_bull', 'trend_bear', 'range', 'chop', 'breakout'
    atr DOUBLE PRECISION NOT NULL,
    adx DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (symbol, timeframe, timestamp)
);

-- 4. 30-Year Event & Regime Library (1996 - Present)
CREATE TABLE historical_events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL, -- 'CENTRAL_BANK', 'CRISIS', 'INFLATION_SHOCK', 'RECESSION'
    event_date DATE NOT NULL,
    macro_regime VARCHAR(32) NOT NULL, -- 'high_inflation', 'risk_off', 'qe', 'strong_usd'
    notes TEXT,
    post_returns_json TEXT -- Asset returns at +1h, +1d, +1w, +1m
);

-- 5. Situation Fingerprints & Historical Analogs
CREATE TABLE analog_library (
    id SERIAL PRIMARY KEY,
    fingerprint_hash VARCHAR(64) NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    regime VARCHAR(32) NOT NULL,
    volatility_bucket VARCHAR(16) NOT NULL, -- 'low', 'normal', 'high', 'extreme'
    momentum_bucket VARCHAR(16) NOT NULL,
    event_context VARCHAR(32) NOT NULL,
    sample_size INT NOT NULL,
    hit_rate DOUBLE PRECISION NOT NULL,
    avg_move_atr DOUBLE PRECISION NOT NULL,
    max_drawdown_atr DOUBLE PRECISION NOT NULL,
    closest_dates_json TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CFTC Commitments of Traders (COT) History
CREATE TABLE cot_reports (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL REFERENCES symbols(symbol),
    report_date DATE NOT NULL,
    commercial_net INT NOT NULL,
    non_commercial_net INT NOT NULL,
    percentile_3y DOUBLE PRECISION NOT NULL,
    percentile_30y DOUBLE PRECISION NOT NULL,
    UNIQUE(symbol, report_date)
);

-- 7. Economic Calendar & Blackout Windows
CREATE TABLE economic_calendar (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(128) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    impact_level VARCHAR(8) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_value VARCHAR(32),
    forecast_value VARCHAR(32),
    previous_value VARCHAR(32),
    blackout_window_mins INT NOT NULL DEFAULT 60
);

-- 8. Debate Transcripts & Round Snapshots
CREATE TABLE debate_transcripts (
    id SERIAL PRIMARY KEY,
    scan_id VARCHAR(64) NOT NULL,
    symbol VARCHAR(16) NOT NULL REFERENCES symbols(symbol),
    timeframe VARCHAR(8) NOT NULL,
    timestamp BIGINT NOT NULL,
    round_1_json TEXT NOT NULL, -- All 10 specialist outputs
    round_2_json TEXT NOT NULL, -- Cross-examination & revisions
    round_3_arbiter_json TEXT NOT NULL, -- Arbiter final output
    total_tokens_used INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Trade Recommendations (Strictly Non-Execution)
CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    scan_id VARCHAR(64) NOT NULL,
    symbol VARCHAR(16) NOT NULL REFERENCES symbols(symbol),
    trade_timeframe VARCHAR(8) NOT NULL,
    recommendation VARCHAR(16) NOT NULL, -- 'BUY', 'SELL', 'NO_TRADE'
    confidence INT NOT NULL,
    entry_low DOUBLE PRECISION,
    entry_high DOUBLE PRECISION,
    stop_loss DOUBLE PRECISION,
    take_profit_1 DOUBLE PRECISION,
    take_profit_2 DOUBLE PRECISION,
    risk_reward DOUBLE PRECISION,
    evidence_badge VARCHAR(4) NOT NULL, -- 'A', 'B', 'C'
    evidence_quality_json TEXT NOT NULL,
    invalidation_level DOUBLE PRECISION,
    consensus_level VARCHAR(16) NOT NULL,
    rationale TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'TP1_HIT', 'TP2_HIT', 'SL_HIT', 'EXPIRED', 'VETOED'
    resolved_at TIMESTAMP WITH TIME ZONE,
    actual_return_r DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Agent Scorecards & Bayesian Performance Tracking
CREATE TABLE agent_scorecards (
    agent_name VARCHAR(64) NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    timeframe VARCHAR(8) NOT NULL,
    resolved_trades INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    hit_rate DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    avg_r DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    profit_factor DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    max_drawdown_r DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    current_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0, -- Bayesian dynamic weighting
    in_sample_hit_rate DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    out_of_sample_hit_rate DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(agent_name, symbol, timeframe)
);
```

---

## 5. Proposed Codebase Architecture & File Tree

```
├── docker-compose.yml              # Production bundle (FastAPI, Redis, Celery, TimescaleDB)
├── Dockerfile                      # Full-stack containerization
├── server.ts                       # Node.js backend proxy & quant engine runner
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Main dashboard container & router
│   ├── index.css                   # Tailwind v4 styles & dark theme configuration
│   ├── assets/                     # Visual assets & icons
│   ├── types/
│   │   ├── market.ts               # Candle, FeatureSnapshot, Timeframe, Watchlist types
│   │   ├── debate.ts               # Round 1, Round 2, Arbiter schemas & interfaces
│   │   └── scorecard.ts            # Scorecard, Bayesian weights, Performance types
│   ├── quant/                      # Pure Deterministic Quant Engine (NO LLM)
│   │   ├── indicators.ts           # EMA, RSI, MACD, Stoch, ADX, ATR, Bollinger Bands
│   │   ├── structure.ts            # Pivots, Swing highs/lows, BOS, CHoCH, S/R clusters
│   │   ├── patterns.ts             # Candlestick pattern recognition
│   │   └── regime.ts               # 6-Factor Regime Classifier (trend/range/chop/expansion)
│   ├── analogs/                    # 30-Year Historical Knowledge Base
│   │   ├── analogEngine.ts         # Situation fingerprint matching & N>=30 verification
│   │   ├── historicalEvents.ts     # 1996-2026 Crisis & Central Bank database
│   │   ├── cotEngine.ts            # CFTC COT 30y percentile parser
│   │   └── kbDocuments.ts          # Curated specialist methodology notes
│   ├── agents/                     # Multi-Agent Debate Engine
│   │   ├── prompts.ts              # Exact system prompts for 10 agents + Arbiter
│   │   ├── schemas.ts              # Strict JSON schemas & validators with retry logic
│   │   ├── orchestrator.ts         # 3-Round Debate Controller (R1 -> R2 -> Arbiter)
│   │   └── riskManager.ts          # Hard Risk Gate & Veto calculation
│   ├── data/                       # Data Fetching & Providers
│   │   ├── dataProvider.ts         # Pluggable interface
│   │   ├── yahooProvider.ts        # Yahoo Finance & Live Forex/Commodities fetcher
│   │   ├── fredProvider.ts         # FRED macroeconomic rate differential engine
│   │   └── calendarProvider.ts     # Economic calendar & event risk parser
│   ├── backtest/                   # Quantitative Backtest & Scorecard Harness
│   │   ├── engine.ts               # Walk-forward validator & Bayesian weight updater
│   │   └── scorecards.ts           # Agent performance tracking
│   └── components/                 # Dark Bloomberg / TradingView Terminal UI
│       ├── TopNav.tsx              # Clean 3-zone header with scan status & trigger
│       ├── WatchlistTable.tsx      # Ranked opportunity scanner & MTF alignment heatmap
│       ├── ChartViewport.tsx       # Candlestick chart + Entry/SL/TP & S/R overlays
│       ├── DebateChamber.tsx       # 3-Round Debate Drawer & Arbiter Synthesis panel
│       ├── AgentScorecards.tsx     # Bayesian weights, hit rates, equity curve
│       ├── RiskMatrixModal.tsx     # Risk Manager structural & correlation check
│       └── SettingsPanel.tsx       # Watchlist config, risk per trade, scan thresholds
```

---

## 6. Phased Implementation Roadmap

- **Phase 1: Foundation & Quant Feature Engine**
  - Implement deterministic indicators (`EMA`, `RSI`, `MACD`, `Stochastic`, `ADX`, `ATR`, `Bollinger Bands`, pivots, swing `BOS`/`CHoCH`, S/R clusters).
  - Setup 30-year analog database (1996–2026 events, COT percentiles, situation fingerprinting).
  - Write test harness verifying indicators on sample multi-timeframe candles.
- **Phase 2: Single Agent End-to-End (Trend & Momentum)**
  - Implement Agent 1 with Gemini API integration, strict JSON validation, and analog citation rules.
  - Verify snapshot feeding, analog querying, and schema compliance.
- **Phase 3: All 10 Specialist Agents + 3-Round Debate + Chief Arbiter**
  - Implement all 10 specialist agents with distinct system instructions.
  - Implement Round 2 Cross-Examination protocol (`disagrees_with`, `convinced_by`, `revised`).
  - Implement Chief Arbiter synthesis with Risk Manager veto gating and evidence quality badging.
- **Phase 4: Quantitative Scorecards & Bayesian Dynamic Weights**
  - Implement live paper-trading scorecard tracking resolved recommendations (TP1/TP2/SL/Expiry).
  - Bayesian weight updates fed into Arbiter synthesis.
- **Phase 5: Full Institutional Dashboard & Multi-Timeframe Scanner**
  - High-density dark terminal UI (TradingView style candlestick chart with overlays, watchlist heatmap, debate stream).
  - Scheduler / automatic scan triggers with economic calendar blackout protection.
- **Phase 6: Docker Compose Production Bundle & Documentation**
  - Provide `docker-compose.yml` (FastAPI + Celery + TimescaleDB/pgvector) for external production deployment alongside the Node/React web applet.
