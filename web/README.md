# StockPilot Web Application

**Management & Analytics Portal** built with **React 19**, **TypeScript**, and **Vite**.

StockPilot Web provides management oversight for inventory levels, sales trends, demand projections, and procurement proposals. In adherence to architectural rules, the web client interacts exclusively with the ASP.NET Core API at `http://localhost:5004/api/v1` and never calls databases, LLMs, or third-party services directly.

---

## Key Features (Sales & Demand + Demand Forecast Agent)

1. **Executive KPI Dashboard**: Real-time sales revenue, transaction count, average order value, units sold, and statistical forecast confidence score.
2. **Interactive Demand Projection Curve**: Built with [Recharts](https://recharts.org/), featuring projected daily velocity overlaid with 95% Confidence Interval (Upper & Lower bounds) and customizable forecast horizons (7, 14, 30, 60, 90 days).
3. **Deterministic Reorder Point (ROP) Engine**:
   $$\text{ROP} = (\text{Lead Time} \times \text{Average Daily Sales}) + \text{Safety Stock}$$
   Categorizes items into `Critical`, `Warning`, and `Normal` urgency with days-of-supply remaining.
4. **Demand Forecast Agent Execution & Trace**:
   - Executes multi-tool agent workflows (`FetchSalesHistoryTool`, `ComputeStatisticalBaselineTool`, `EvaluateMarketFactorsTool`, `SynthesizeForecastTool`).
   - Side drawer inspecting real-time execution duration, step timeline, inputs/outputs, guardrail validations, and raw JSON conforming to `workflow-state.example.json`.
5. **Prompt-Injection Defense Testing**: Built-in test trigger in the forecast modal demonstrating active sanitization of hostile prompt injections.
6. **Proposal Handoff to Procurement**: One-click action generating structured purchase proposals for teammate consumption.
7. **Sales Transaction Ledger & POS Modal**: Filterable ledger with real-time tax, discount, and item calculation modal.

---

## Getting Started

### 1. Prerequisites
- Node.js (v20 or higher)
- Backend API running at `http://localhost:5004` (see `backend/README.md`)

### 2. Installation
```bash
npm install
```

### 3. Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### 4. Code Quality & Linting
```bash
npm run lint
```

### 5. Production Build
```bash
npm run build
```

---

## Component Architecture

```
web/src/
├── components/
│   ├── layout/Navbar.tsx             # Global navigation bar and action triggers
│   └── sales/
│       ├── AgentTraceDrawer.tsx      # Sliding drawer showing auditable agent workflow traces
│       ├── ForecastChart.tsx         # Recharts interactive curve with CI upper/lower bounds
│       ├── KpiCards.tsx              # Executive metrics overview cards
│       ├── RecordSaleModal.tsx       # Transaction entry form with line-item calculations
│       ├── ReorderTable.tsx          # ROP table with urgency badges and proposal handoff
│       ├── RunForecastModal.tsx      # Autonomous agent execution modal with market note inputs
│       └── SalesLedgerTable.tsx      # Transaction history with search and filtering
├── services/
│   └── api.ts                        # Axios API client connecting to /api/v1 endpoints
├── types/
│   └── sales.ts                      # Domain TypeScript interfaces and agent contracts
├── App.tsx                           # Main application coordinator
└── index.css                         # Custom dark glassmorphism design system
```
