# Multi-Broker Live & Demo Execution Gateway (Capital.com, MT5, IG Markets)

Unified institutional broker gateway connecting the Multi-Agent Quantitative Terminal to Capital.com, MetaTrader 5 (MT5 via MetaAPI), and IG Markets. Enables seamless switching between Demo and Live accounts, server-side encrypted credential management, real-time balance and position synchronization, and automated order execution directly triggered by the Chief Arbiter upon meeting Risk Manager safety gates across 15 Forex, Commodity, and Crypto assets.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters were selected during interactive clarification and are locked into this plan:
>
> - **Supported Broker Adapters**: Native support for **Capital.com** (REST v1 sessions with CST and security tokens), **MetaTrader 5** (MT5 Cloud REST via MetaAPI), and **IG Markets** (REST API with CST/X-SECURITY-TOKEN and CFD epics).
> - **Watchlist Scope**: 15 Assets spanning Forex Majors (7), Commodities (5), and Crypto (3: `BTCUSD`, `ETHUSD`, `SOLUSD`) with verified live price feeds from Yahoo Finance and matching broker epics.
> - **Execution Mode**: **Automated Auto-Execution** triggered whenever the Chief Arbiter generates an actionable `BUY` or `SELL` consensus with Risk Manager approval (`R:R >= 1.5`, valid ATR-based Stop Loss & Take Profits, no active economic blackout). Includes manual emergency kill-switch and manual order ticket overrides.
> - **Credential Security & Key Management**: **Server-Side Encrypted Vault** (AES-256-GCM with environment salt) paired with an intuitive credential management modal for setting API keys, account identifiers, environment toggles (`DEMO` vs `LIVE`), and connection ping diagnostics.

---

## 1. Overview & Core Concept

### What It Does
The Multi-Broker Execution Gateway transforms the Quant Terminal from an analytical and paper-trading research suite into a live operational trading terminal. 

Key capabilities:
1. **Multi-Broker Credential Manager**: A dedicated security drawer allowing traders to configure API credentials, switch between **Demo** (practice sandbox) and **Live** (real capital) accounts, and verify connectivity with latency ping checks across Capital.com, MT5, and IG Markets.
2. **Standardized Broker Abstraction Layer (IBrokerAdapter)**: Uniform internal interface mapping terminal symbols (`EURUSD`, `XAUUSD`, `WTI`, etc.) to broker-specific epics/tickers (`EUR_USD`, `GOLD`, `US_OIL`), standardizing lot sizing, pip precision, and order structures.
3. **Automated Order Dispatch Pipeline**: Automatically translates Chief Arbiter recommendations into market/limit orders with hardcoded Stop Loss and Take Profit brackets.
4. **Pre-Trade Risk Gate Enforcement**: Every outbound order must pass the Risk Manager's pre-trade checks (R:R $\ge 1.5$, max 1% account risk sizing, spread ceiling check, and economic blackout protection) before reaching the broker network.
5. **Live Position & Balance Telemetry**: Real-time display of broker equity, free margin, margin utilization, open positions, unrealized PnL, and live order execution audit logs.

### Target Audience & Persona
Quantitative discretionary and systematic traders operating on Capital.com, MetaTrader 5, or OANDA who want institutional multi-agent validation to directly execute trades without manual copy-pasting.

---

## 2. User Experience & Visual Design

### Aesthetic Direction: Dark Institutional Workstation
Refined Dark Bloomberg / TradingView terminal style adhering to anti-slop guidelines:
- **Canvas Palette**: `#090D16` (Obsidian Base) and `#0F172A` (Slate Surface) with subtle 1px hairline dividers (`rgba(255,255,255,0.08)`).
- **Accents**: Emerald (`#10B981`) for Long/Live Connected, Rose (`#F43F5E`) for Short/Errors, Cyan (`#38BDF8`) for Active Broker Focus, and Amber (`#F59E0B`) for Demo Sandbox.
- **Typography**: `Plus Jakarta Sans` for titles and navigation, paired with `JetBrains Mono` tabular figures (`tabular-nums font-mono`) for all prices, account balances, lot sizes, and ticket IDs.

### Key User Flows

#### Flow 1: Broker Configuration & Verification
1. Trader clicks the new **Broker Gateway** button on the Top Bar (showing active broker status e.g. `CAPITAL.COM [DEMO]`).
2. A sleek slide-over credential modal opens featuring 3 broker tabs: **Capital.com**, **MetaTrader 5**, and **OANDA**.
3. For each broker, the user enters:
   - Environment: `DEMO` or `LIVE` toggle
   - API Key / Bearer Token
   - User Identifier / Email & Password (for Capital.com CST session negotiation)
   - Account ID
4. User clicks **Test Connection**: Server validates credentials against the broker endpoint, displays latency (e.g. `42ms`), pulls current balance, and marks status as `READY`.
5. User selects their **Primary Active Broker** for execution.

#### Flow 2: Automated Trade Dispatch & Safety Monitoring
1. A multi-agent debate completes on `XAUUSD` or `EURUSD`.
2. The Chief Arbiter outputs `BUY` with an evidence badge of `A` and `R:R = 2.1`.
3. The automated execution engine checks the **Active Broker**:
   - Computes lot size based on 1% equity risk and broker min/max lot constraints.
   - Dispatches a market order with verified Stop Loss and Take Profit levels.
4. A transient terminal toast confirms order submission with ticket ID, execution price, and fill timestamp.
5. The **Positions Table** updates immediately with live broker telemetry and unrealized PnL.

#### Flow 3: Manual Execution & Emergency Kill-Switch
1. The trader can open the **Order Ticket Drawer** from any chart or scanner opportunity to review or adjust lot size, SL, and TP before manual submission.
2. A prominent red **Emergency Kill-Switch (Flatten All)** allows one-click liquidation of all open broker positions in high-volatility events.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Server-Side Broker Proxy vs. Direct Browser Web Requests
- **Chosen Approach**: All broker API calls route through the Express server backend (`/api/broker/*`).
- **Why**: 
  1. Major broker REST APIs (Capital.com, OANDA, MetaAPI) enforce strict CORS policies that block direct browser `fetch()` calls.
  2. Protects sensitive API keys and session tokens from being exposed in client-side network tabs or DOM state.
  3. Enables background automated execution even if the user temporarily switches browser tabs.
- **Alternatives Considered**: Direct client-side calls (rejected due to CORS preflight blocks and security risks).

### Decision 2: Multi-Broker Unified Abstraction (`IBrokerAdapter`)
- **Chosen Approach**: Standardized interface decoupling the terminal UI from broker-specific quirks.
- **Why**: Allows adding future brokers (Interactive Brokers, cTrader, Binance) without rewriting debate orchestration or UI components.
- **Alternatives Considered**: Hardcoding Capital.com logic directly into `DebateChamber` (rejected as rigid and unmaintainable).

### Decision 3: Automated Execution Guardrails & Risk Gates
- **Chosen Approach**: Absolute pre-trade gate interception. Even in "Automated Auto-Execution" mode, an order will be rejected if:
  1. Risk Manager issued a `VETO`.
  2. Calculated R:R is $< 1.5$.
  3. High-impact economic news event blackout is active for that currency.
  4. Spread exceeds $3\times$ standard broker spread.
- **Why**: Safeguards real trader capital from catastrophic algorithmic slippage or news-whipsaw liquidations.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MULTI-AGENT QUANT TERMINAL UI                      │
│   Chamber & Chart · Market Scanner · Live Positions · Broker Gateway    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND PROXY (PORT 3000)                   │
│                                                                         │
│  [API Endpoints]                                                        │
│  - GET/POST /api/broker/credentials  (AES-256 Encrypted Store)          │
│  - POST     /api/broker/connect      (Session Handshake & Ping)         │
│  - GET      /api/broker/account      (Balance, Margin, Equity)          │
│  - GET      /api/broker/positions    (Open Broker Positions)            │
│  - POST     /api/broker/order        (Standardized Order Dispatch)      │
│  - POST     /api/broker/close        (Position Close / Flatten All)     │
│  - POST     /api/broker/auto-exec    (Toggle Automated Execution)       │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│       PRE-TRADE RISK GATES        │ │       BROKER ADAPTER ENGINE       │
│  - Risk Manager VETO Check        │ │  ┌──────────────┐ ┌────────────┐  │
│  - Minimum 1.5 R:R Enforcement    │ │  │ Capital.com  │ │ MT5 / Meta │  │
│  - 1% Account Risk Sizing Math    │ │  └──────────────┘ └────────────┘  │
│  - News Blackout Protection       │ │  ┌──────────────┐ ┌────────────┐  │
│                                   │ │  │ OANDA v20    │ │ Sim Paper  │  │
│                                   │ │  └──────────────┘ └────────────┘  │
└───────────────────────────────────┘ └─────────────────┬─────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL BROKER REST & FIX APIS                     │
│  Capital.com (CST/X-SECURITY) · MetaAPI (MT5 Cloud) · OANDA (v20 Bearer)│
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Models & Schemas

#### Broker Account Configuration
```typescript
interface BrokerConfig {
  id: 'CAPITAL_COM' | 'MT5' | 'OANDA';
  name: string;
  environment: 'DEMO' | 'LIVE';
  apiKey: string;
  apiSecret?: string;       // Password or secret token
  accountId?: string;       // Broker trading account identifier
  identifier?: string;      // Login username or email
  isActive: boolean;
  isAutoExecutionEnabled: boolean;
  lastConnectedAt?: number;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  errorMessage?: string;
}
```

#### Standardized Broker Order Request
```typescript
interface StandardizedOrderRequest {
  brokerId: 'CAPITAL_COM' | 'MT5' | 'OANDA';
  symbol: string;           // Normalized terminal symbol: EURUSD, XAUUSD, WTI
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  units: number;            // Normalized volume / contract size
  entryPrice?: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  riskReward: number;
  clientOrderId: string;
  source: 'AUTO_ARBITER' | 'MANUAL_TICKET';
}
```

#### Standardized Broker Position & Audit Log
```typescript
interface BrokerPosition {
  id: string;
  brokerId: string;
  brokerTicketId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  units: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnL: number;
  unrealizedPnLR: number;
  openedAt: number;
  environment: 'DEMO' | 'LIVE';
}
```

---

## 5. Execution Steps

1. **Broker Adapter Core Engine (`src/broker/`)**:
   - Implement `IBrokerAdapter` interface with symbol translation mapping (`symbolMapper.ts`).
   - Implement `CapitalComAdapter` (session auth, `CST`/`X-SECURITY-TOKEN` headers, position placement, account balances).
   - Implement `MetaTraderAdapter` (MetaAPI REST trade client, order send, account metrics).
   - Implement `OandaAdapter` (v20 REST accounts, order dispatch with `stopLossOnFill` and `takeProfitOnFill`).
   - Implement `brokerManager.ts` managing active connections, encrypted storage, and auto-dispatch router.

2. **Backend API Endpoints (`server.ts`)**:
   - Secure encrypted credential routes (`GET/POST /api/broker/credentials`).
   - Handshake and ping endpoint (`POST /api/broker/connect`).
   - Telemetry sync endpoints (`GET /api/broker/account`, `GET /api/broker/positions`).
   - Order submission and emergency flatten endpoints (`POST /api/broker/order`, `POST /api/broker/flatten`).

3. **Terminal Frontend UI Integration**:
   - Add **Broker Gateway** status widget to `TopBar` showing current connected broker, environment badge (`DEMO` / `LIVE`), and latency.
   - Build **BrokerSettingsModal** allowing credential configuration, connection testing, and live balances.
   - Build **LiveBrokerPositionsPanel** displaying active broker positions, margin utilization, and emergency flatten button.
   - Connect the Chief Arbiter synthesis in `DebateChamber` and `scannerService` to automatically dispatch approved trades when Auto-Execution is enabled.
