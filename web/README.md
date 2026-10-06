# React Web

One app shell for all four modules — shared login, navigation and theme.

```
web/src/
  modules/
    inventory/       Student 1 — dashboards, products, categories, stock, batches, movements, transfers, branches;
                     users/ (user administration, TSX)
    sales-demand/    Student 2 — Sales & Forecasts dashboard (TSX + Tailwind)
    suppliers/       Student 3 — overview, suppliers, quotations, evaluation (TSX + Tailwind)
    procurement/     Student 4 — proposals, approvals, orders, budgets, Replenishment Agent (orchestrator)
  shared/
    theme/           design tokens and base styles (global.css), app-wide component styles (inventory.css),
                     Tailwind utilities themed with the shell's tokens (tailwind.css)
    layout/          AppLayout (top bar, page frame) and layout.css
    navigation/      Sidebar
    auth/            AuthContext, ProtectedRoute, login / profile / change-password pages
    api/             adapter the TSX modules use to call the API through the shared axios client
  api/               API clients (shared axios client with JWT; per-module endpoint modules)
  components/ui/     shared UI kit (Badge, Modal, Skeleton, …)
  App.jsx            routes (one composition root); main.jsx
```

```
cd web
npm install
npm run dev          # http://localhost:3000, API from VITE_API_BASE_URL (default http://localhost:5257)
npm test             # unit tests (vitest + MSW)
npm run build
npm run test:e2e     # live end-to-end stage, driven by scripts/e2e/run-replenishment-e2e.sh
```
