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
| Inventory Management | Inventory Optimization Agent | Teammate 1 (TBD) |
| Sales & Demand | Demand Forecast Agent | Ravi (Active Implementation) |
| Supplier Management | Supplier Evaluation Agent | Teammate 3 (TBD) |
| Procurement Management | Procurement Coordinator Agent | Teammate 4 (TBD) |

## Repository layout

- `backend/` - ASP.NET Core solution/projects and tests
- `web/` - React app
- `mobile/` - Flutter app
- `agentic-ai/` - contracts, prompts/configuration, evaluation cases or internal service code
- `docs/` - architecture, ADRs, database, API, testing evidence
- `.github/` - CI and collaboration templates

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
