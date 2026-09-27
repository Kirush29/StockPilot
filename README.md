# StockPilot
**Right Stock. Right Supplier. Right Time.**

StockPilot is an integrated inventory and procurement management system built for SE3090 Assignment 1. The system uses one ASP.NET Core Web API and one PostgreSQL database shared by a React management web app and a Flutter operational mobile app. A controlled four-agent AI workflow supports demand forecasting, inventory optimization, supplier evaluation and procurement coordination.

## Architecture rules

- React and Flutter call only the ASP.NET Core API.
- Clients never call PostgreSQL, Agentic AI, or third-party services directly.
- AI creates procurement proposals, not purchase orders. Purchase-order creation requires an authorized human approval.
- Persist auditable workflow summaries, not hidden model reasoning.
- Keep credentials out of Git. Copy `.env.example` locally and fill secrets outside version control.

## Student-owned components

| Component | Suggested AI agent | Owner |
|---|---|---|
| Inventory Management | Inventory Optimization Agent | Mathusha P (In Progress) |
| Sales & Demand | Demand Forecast Agent | Ravi (Active Implementation) |
| Supplier Management | Supplier Evaluation Agent | Kulshan Begum (TBD) |
| Procurement Management | Procurement Coordinator Agent | Kirushan (Under Development) |

## Repository layout

```
backend/
  StockPilot.Api/                 single ASP.NET Core Web API project
    Modules/
      Inventory/                  Student 1 — controllers, services, entities, host services
      SalesDemand/                Student 2 — incl. the Demand Forecast Agent
      Suppliers/                  Student 3 — incl. the bridge to the Supplier Evaluation Agent
      Procurement/                Student 4 — incl. the Procurement Coordinator Agent
    Shared/
      Identity/                   one JWT + role-policy setup for every module
      Data/                       AppDbContext (the one DbContext), migrations, dev demo data
      Agents/Orchestrator/        multi-agent Replenishment Orchestrator
      Agents/Contracts/           shared agent workflow-state contract
      Integration/                cross-module adapters (Procurement <-> Inventory/Suppliers)
    Program.cs                    one composition root
  tests/, StockPilot.Tests/       test projects
web/                              React app (one shell)
  src/modules/{inventory, sales-demand, suppliers, procurement}
  src/shared/{theme, layout, navigation, auth, api}
mobile/                           Flutter app
  lib/modules/{inventory, sales_demand, procurement}
  lib/shared/{theme, navigation, auth}
agentic-ai/
  agents/supplier_evaluation/     the Python agent (the other agents and the orchestrator run in the API)
  contracts/, evaluation/         agent contracts and golden cases
docs/                             architecture, ADRs, database, integration plan, testing evidence
scripts/e2e/                      cross-platform end-to-end run
```

## First setup

1. Create a private GitHub repository named using your module/group convention, for example `SE3090_GXX_StockPilot`.
2. Add all four students as collaborators.
3. Push this base to `main`.
4. Protect `main`: require pull requests and at least one approval.
5. Create labels: `inventory`, `sales-demand`, `supplier`, `procurement`, `agentic-ai`, `backend`, `react`, `flutter`, `database`, `testing`, `docs`.
6. Create a GitHub Project board: Backlog -> Ready -> In Progress -> Review -> Done.
7. Assign one business component and one distinct AI agent to each student.
8. Replace placeholders with real .NET, React and Flutter scaffolds.
9. Update CI so it builds/tests real projects on every push/PR.

## Branch naming

`feature/<short-name>`, `fix/<short-name>`, `test/<short-name>`, `docs/<short-name>`

Examples: `feature/inventory-stock-count`, `feature/supplier-quotation-compare`, `test/procurement-approval`.

## Commit convention

Use small meaningful commits, e.g. `feat: add stock movement endpoint`, `test: cover invalid quotation`, `docs: add ADR for Flutter state management`.

## Never commit

Secrets, API keys, connection-string passwords, real personal data, build folders, local IDE files, or fabricated test/evaluation evidence.
