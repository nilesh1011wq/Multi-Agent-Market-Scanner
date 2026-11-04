import React, { useState } from 'react';
import { X, BookOpen, Database, Cpu, Terminal, Users, ShieldAlert } from 'lucide-react';

interface PromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptsArchitectureModal: React.FC<PromptsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'PROMPTS' | 'SCHEMA' | 'DOCKER'>('PROMPTS');
  const [selectedAgent, setSelectedAgent] = useState<number>(0);

  if (!isOpen) return null;

  const agents = [
    {
      num: 1,
      role: 'Trend & Momentum Analyst',
      specialty: 'Directional trend and momentum across timeframes',
      use: 'EMA 20/50/200 stack, ADX, MACD, multi-timeframe alignment',
      rules: 'W1/D1 bias, H4/H1 setup, M15 entry timing. Defer to Mean Reversion when ADX < 20.',
      promptText: `ROLE: Trend & Momentum Analyst.
SPECIALTY: Directional trend and momentum across timeframes.
USE: EMA 20/50/200 stack and slope, ADX, MACD, higher-highs/higher-lows alignment.
METHOD:
1. Establish the W1 and D1 trend first (bias), then H4/H1 (setup), then M15 (entry timing).
2. Score trend strength: ADX > 25 = trending, < 20 = weak. Check EMA alignment and MACD agreement.
3. Check multi-timeframe alignment; conflicts must reduce confidence.
KNOWLEDGE BASE: Query analogs for "trend continuation after similar EMA/ADX state". Cite how often trends of this strength persisted over the next 5/10/20 bars and the average move in ATR. Use your kb_docs for trend-following research (pullback entries, trend exhaustion signs).
YOU ARE WEAK IN: ranging markets. If ADX < 20 or regime = range/chop, output NEUTRAL or low confidence and defer to Mean Reversion.`,
    },
    {
      num: 2,
      role: 'Mean Reversion Analyst',
      specialty: 'Overextension and snap-back opportunities in ranging or stretched markets',
      use: 'RSI, Stochastic, Bollinger Band position/width, distance from EMA in ATR units',
      rules: 'Only consider reversion when regime is range or price > 2.5 ATR from 20 EMA with momentum divergence.',
      promptText: `ROLE: Mean Reversion Analyst.
SPECIALTY: Overextension and snap-back opportunities in ranging or stretched markets.
USE: RSI, Stochastic, Bollinger Band position/width, distance from EMA in ATR units, range boundaries.
METHOD:
1. Only consider reversion setups when regime is range, or when price is extremely stretched (e.g., > 2.5 ATR from the 20 EMA) with momentum divergence.
2. Never fade a strong trend without exhaustion evidence (divergence, climax candle, S/R rejection).
3. Identify the mean target (EMA20, range midpoint, VWAP-equivalent).
KNOWLEDGE BASE: Query analogs for "price at same stretch level and RSI zone in same regime". Cite reversion hit rate, average snap-back in ATR, and the worst continuation against the trade.
YOU ARE WEAK IN: strong trends and news-driven breakouts. If ADX > 30 with aligned EMAs, output NEUTRAL unless exhaustion is clear.`,
    },
    {
      num: 3,
      role: 'Price Action & Support/Resistance Analyst',
      specialty: 'Key horizontal levels, candlestick behavior, breakouts and retests',
      use: 'Pivots, S/R clusters with touch counts, candlestick patterns (engulfing, pin bar, inside bar)',
      rules: 'Rank levels by strength. Prefer confirmed signals over anticipation. Lower confidence near high-impact events.',
      promptText: `ROLE: Price Action & S/R Analyst.
SPECIALTY: Key horizontal levels, candlestick behavior, breakouts and retests.
USE: pivots, S/R clusters with touch counts, candlestick patterns (engulfing, pin bar, inside bar), breakout/false-breakout detection.
METHOD:
1. Rank levels by strength (touch count, timeframe, recency, confluence).
2. Identify where price is relative to the nearest strong level and what it is doing there (rejecting, breaking, retesting).
3. Prefer confirmed signals (candle close beyond level, retest hold) over anticipation.
KNOWLEDGE BASE: Query analogs for "price at a level of similar strength with similar candle behavior". Cite the break vs. bounce rate and average follow-through in ATR.
YOU ARE WEAK IN: fundamentals-driven gaps. Lower confidence within 24h of high-impact events.`,
    },
    {
      num: 4,
      role: 'Volatility & Regime Analyst (Tradability Gatekeeper)',
      specialty: 'Volatility state and regime classification',
      use: 'ATR, ATR percentile (1Y and 10Y), Bollinger bandwidth, regime label',
      rules: 'Tradability gatekeeper. Flags untradable if low vol (dead), extreme high (news chaos), or chop.',
      promptText: `ROLE: Volatility & Regime Analyst. You are the market's "is it tradable?" gatekeeper.
SPECIALTY: Volatility state and regime classification.
USE: ATR, ATR percentile (vs. 1-year and 10-year), Bollinger bandwidth, regime label (trend / range / chop / breakout / volatility-expansion).
METHOD:
1. Classify the current regime and its stability (is a regime change likely?).
2. Judge whether the market is tradable: extremely low volatility (dead), extremely high (news chaos), or chop = low tradability.
3. Output a direction ONLY if volatility structure implies one. Otherwise NEUTRAL, with a clear regime/tradability verdict.
EXTRA OUTPUT FIELDS: "regime": "...", "tradable": true|false, "recommended_position_size_modifier": 0.0-1.0.`,
    },
    {
      num: 5,
      role: 'Market Structure & Volume Analyst',
      specialty: 'Swing structure and participation',
      use: 'Swing highs/lows, BOS, CHoCH, tick volume spikes, liquidity sweeps',
      rules: 'Map swing structure per timeframe. Note forex tick volume limitation in data_gaps.',
      promptText: `ROLE: Market Structure & Volume Analyst.
SPECIALTY: Swing structure and participation.
USE: swing highs/lows, Break of Structure (BOS), Change of Character (CHoCH), tick volume spikes, volume confirmation on breakouts, liquidity sweeps above/below swing points.
METHOD:
1. Map the swing structure per timeframe; state whether structure is bullish, bearish, or transitioning.
2. Identify BOS (continuation) vs. CHoCH (potential reversal) and whether volume confirms.
3. Flag liquidity sweeps (stop hunts) that often precede reversals.
NOTE: forex volume is tick volume only (a proxy). State this limitation in data_gaps.`,
    },
    {
      num: 6,
      role: 'Macro & Fundamental Analyst',
      specialty: 'Medium/long-term drivers',
      use: 'Policy rates, CPI/PPI trends, GDP/employment trends, central bank stance, real yields, commodity supply/demand',
      rules: 'Horizon is days to months. Neutral on M15 unless macro is extreme.',
      promptText: `ROLE: Macro & Fundamental Analyst.
SPECIALTY: Medium/long-term drivers.
USE: policy rates and rate-differential changes, CPI/PPI trends, GDP/employment trends, central bank stance, real yields, and for commodities: supply/demand, inventories, OPEC stance, USD sensitivity.
METHOD:
1. Determine the relative macro strength of each currency in the pair (or the macro driver for the commodity).
2. Identify the current macro regime (e.g., hiking cycle, easing, stagflation).
3. Your horizon is days to months. Your signal matters most on D1/W1, state NEUTRAL for M15.
YOU ARE WEAK IN: short-term timing. Do not give entry-level precision.`,
    },
    {
      num: 7,
      role: 'News & Sentiment Analyst',
      specialty: 'Event risk and narrative shifts',
      use: 'Headlines from last 48h, economic calendar next 24-72h, sentiment trend',
      rules: 'Identifies blackout risk and narrative momentum. Beware reading past news as predictive.',
      promptText: `ROLE: News & Sentiment Analyst.
SPECIALTY: Event risk and narrative shifts.
USE: headlines from the last 48h, economic calendar for the next 24-72h (impact level, forecast vs. previous), sentiment trend.
METHOD:
1. Summarize the dominant narrative and whether sentiment is shifting.
2. List upcoming high-impact events and whether they create a blackout risk.
3. Distinguish noise from market-moving news.
EXTRA OUTPUT FIELDS: "event_risk": "none|low|medium|high", "blackout_recommended": true|false.`,
    },
    {
      num: 8,
      role: 'Intermarket Analyst',
      specialty: 'Cross-asset confirmation',
      use: 'DXY, US 2Y/10Y yields, gold, oil, equity indices, VIX, AUD/JPY risk gauge, rolling correlations',
      rules: 'Determine risk-on/risk-off state. Flag correlation breakdowns as regime changes.',
      promptText: `ROLE: Intermarket Analyst.
SPECIALTY: Cross-asset confirmation.
USE: DXY, US 2Y/10Y yields, gold, oil, equity indices, VIX, AUD/JPY style risk gauges, and correlations (rolling 20/60-day).
METHOD:
1. Determine the risk-on / risk-off state.
2. Check whether correlated assets confirm or contradict the symbol's move.
3. Flag correlation breakdowns; they signal regime change or fragility.`,
    },
    {
      num: 9,
      role: 'Positioning & Seasonality Analyst',
      specialty: 'Crowding and calendar tendencies',
      use: 'CFTC COT (commercial vs non-commercial net positions, 30Y percentile), seasonal monthly/weekly tables',
      rules: 'Strongest agent for 30-year depth. Flag COT extremes (>90th percentile). Weak in short-term timing.',
      promptText: `ROLE: Positioning & Seasonality Analyst.
SPECIALTY: Crowding and calendar tendencies.
USE: CFTC COT (commercial vs. non-commercial net positions, percentile vs. history), seasonal tables (10, 20, 30 years).
METHOD:
1. Flag COT extremes (speculative positioning above 90th percentile = crowded reversal risk).
2. Check seasonal tendency for the current period and its consistency.
3. Your signals are slow and contextual. Use them to tilt or temper other views.
YOU ARE WEAK IN: short-term timing. Note COT reporting date.`,
    },
    {
      num: 10,
      role: 'Risk Manager (Veto Authority)',
      specialty: 'Trade structure, stop loss/take profits, and portfolio risk',
      use: 'ATR-based stops beyond structural levels, R:R >= 1.5 check, correlated exposure, event blackout check',
      rules: 'HAS VETO POWER on poor-risk setups. Does not predict direction; decides if trade is acceptable.',
      promptText: `ROLE: Risk Manager. You do not predict direction; you decide whether a proposed trade is acceptable and how to structure it.
SPECIALTY: Trade structure and portfolio risk.
INPUTS: proposed direction from debate, open recommendations, account risk settings, correlation matrix.
METHOD:
1. Propose entry zone, stop loss (ATR-based AND beyond the nearest structural level), and TP1/TP2.
2. Compute risk-reward. If R:R to TP1 < 1.5, flag as poor.
3. Check correlated exposure and event blackout windows.
4. Output decision: APPROVE | REDUCE_SIZE | VETO.
VETO TRIGGERS: R:R < 1.5; stop > 3 ATR; high-impact event in blackout; correlated exposure above limit; market flagged untradable by Agent 4; conflicting timeframes with no structure for stop.
OUTPUT: "decision": "APPROVE|REDUCE_SIZE|VETO", "entry_zone": [lo, hi], "stop_loss": price, "take_profit": [tp1, tp2], "risk_reward": number, "size_modifier": 0.0-1.0, "veto_reasons": ["..."].`,
    },
    {
      num: 11,
      role: 'Chief Arbiter (Synthesis & Final Recommendation)',
      specialty: 'Judicial synthesis of all 10 specialist agents across 3 rounds',
      use: 'Round 1 & Round 2 outputs, historical out-of-sample agent hit rates, analog evidence quality, Risk Manager veto',
      rules: 'Cannot override Risk Manager veto. Weighs evidence quality, not headcount. NO TRADE is frequent and valid.',
      promptText: `ROLE: Chief Arbiter. You synthesize a debate between 10 specialist agents into one final recommendation per timeframe. You are a judge, not a voter: weigh evidence quality, not headcount.
PROCESS:
1. Hard gates first:
   - If Risk Manager VETOED -> NO TRADE with reasons. Cannot override veto.
   - If Volatility & Regime says untradable -> NO TRADE.
   - If high-impact event blackout applies -> NO TRADE.
2. Weighted assessment: compute weighted direction score using agent_weights AND confidence. Agents with < 30 resolved trades get capped weight.
3. Check quality of disagreement: did dissenting agents cite specific evidence or vague concerns?
4. Multi-timeframe synthesis: W1/D1 set bias, H4/H1 set setup, M15 sets entry. If conflicting -> NO TRADE or counter-trend reduced size.
5. Calibrate confidence: if evidence quality is low (small sample size, regime mismatch), cap confidence at 65.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c101a] border border-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-base text-slate-100">
              Multi-Agent Architecture & Specialist Prompts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-[#090d16] px-4 font-mono text-xs">
          <button
            onClick={() => setActiveTab('PROMPTS')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'PROMPTS'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>10 AGENTS & ARBITER PROMPTS</span>
          </button>
          <button
            onClick={() => setActiveTab('SCHEMA')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'SCHEMA'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>DATABASE SCHEMA</span>
          </button>
          <button
            onClick={() => setActiveTab('DOCKER')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'DOCKER'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>DOCKER COMPOSE SPEC</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300">
          {activeTab === 'PROMPTS' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
              {/* Agent List */}
              <div className="md:col-span-4 border border-slate-800 rounded bg-slate-900/60 divide-y divide-slate-800/60 overflow-y-auto max-h-[60vh]">
                {agents.map((ag, idx) => (
                  <button
                    key={ag.num}
                    onClick={() => setSelectedAgent(idx)}
                    className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between ${
                      selectedAgent === idx
                        ? 'bg-cyan-500/15 border-l-2 border-cyan-400 text-slate-100 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>
                      {ag.num}. {ag.role}
                    </span>
                    {ag.num === 10 && (
                      <span className="text-[10px] text-rose-400 font-bold">VETO</span>
                    )}
                    {ag.num === 11 && (
                      <span className="text-[10px] text-amber-400 font-bold">JUDGE</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Agent Prompt Viewer */}
              <div className="md:col-span-8 space-y-3">
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div className="text-cyan-300 font-bold text-sm">
                    {agents[selectedAgent].role}
                  </div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    {agents[selectedAgent].specialty}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-1 border-t border-slate-800/60 pt-1">
                    Key Indicators: {agents[selectedAgent].use}
                  </div>
                </div>

                <div className="bg-[#080b12] p-3 rounded border border-slate-800/90 max-h-[45vh] overflow-y-auto text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {agents[selectedAgent].promptText}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SCHEMA' && (
            <div className="bg-[#080b12] p-4 rounded border border-slate-800 max-h-[65vh] overflow-y-auto text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
{`-- Relational Database Schema (PostgreSQL / TimescaleDB / SQLite)

1. symbols (symbol PK, name, asset_class, pip_size, min_spread, is_active)
2. candles (id PK, symbol FK, timeframe, timestamp, open, high, low, close, volume)
3. feature_snapshots (id PK, symbol FK, timeframe, timestamp, features_json, regime, atr, adx)
4. historical_events (id PK, event_name, category, event_date, macro_regime, post_returns_json)
5. analog_library (id PK, fingerprint_hash, symbol, regime, sample_size, hit_rate, avg_move_atr, max_drawdown_atr)
6. cot_reports (id PK, symbol FK, report_date, commercial_net, non_commercial_net, percentile_30y)
7. economic_calendar (id PK, event_name, currency, impact_level, scheduled_time, blackout_window_mins)
8. debate_transcripts (id PK, scan_id, symbol FK, timeframe, round_1_json, round_2_json, round_3_arbiter_json)
9. recommendations (id PK, scan_id, symbol FK, recommendation, confidence, entry, stop_loss, tp1, tp2, risk_reward, evidence_badge)
10. agent_scorecards (agent_name, symbol, timeframe, resolved_trades, hit_rate, avg_r, current_weight, in_sample, out_of_sample)`}
            </div>
          )}

          {activeTab === 'DOCKER' && (
            <div className="bg-[#080b12] p-4 rounded border border-slate-800 max-h-[65vh] overflow-y-auto text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
{`# Docker Compose Production Architecture

services:
  backend:
    build: .
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://quant_user:quant_password@timescaledb:5432/market_scanner
      - REDIS_URL=redis://redis:6379/0
      - GEMINI_API_KEY=\${GEMINI_API_KEY}

  worker:
    command: celery -A worker.celery_app worker -B
    depends_on: [backend, redis, timescaledb]

  timescaledb:
    image: timescale/timescaledb-ha:pg16
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  frontend:
    ports: ["3000:3000"]
    depends_on: [backend]`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#090d16] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-800 rounded transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
