# StockPilot integration plan and conflict register

Branch: `integration/unified-platform`. Scope: integration glue only (DI, routing, navigation,
theming, naming/dependency conflicts, the multi-agent orchestrator). No change to any module's
business logic, validation rules, schema decisions, or agent reasoning. Anything that needs a
change of that kind is listed under **Conflicts needing a team decision** and is not merged
silently.

## 1. What exists today

| Module (owner) | Backend | DB context / migrations | React | Flutter | Agent |
| --- | --- | --- | --- | --- | --- |
| Inventory (S1) | `backend/StockPilot.API` (Controllers, Services, Entities) | `AppDbContext`, public schema, `StockPilot.API/Migrations` | `web/stockpilot-web` (JSX, React 18, CSS design system, JWT auth, app shell) | **none in repo** (an Expo/React Native app lived in `mobile/`, removed in `eaa2985`) | Inventory Optimization: `InventoryOptimizationService` (Semantic Kernel), `api/optimization` |
| Sales & Demand (S2) | `backend/StockPilot.API` (Application/Sales, Domain/Entities/Sales) | `StockPilot.Infrastructure.Persistence.StockPilotDbContext`, public schema, own migrations; also owns `AgentWorkflowAudits` | `web/src` (TSX, React 19, Tailwind 4, no auth) | `mobile-flutter/lib/sales` | Demand Forecast: `DemandForecastAgent`, `api/v1/agent` |
| Supplier (S3) | ~~separate solution host `backend/src/StockPilot.Api`~~ **now hosted in `backend/StockPilot.API`** (controllers in `Controllers/SupplierManagement`) + Domain/Application/Infrastructure | `StockPilot.Infrastructure.Data.StockPilotDbContext`, snake_case tables, own migrations | `web/src` (Suppliers, Quotations, Evaluation pages) | **none in repo** | Supplier Evaluation: Python `agentic-ai/src`, run as a subprocess |
| Procurement (S4) | `backend/StockPilot.API` (Application/Procurement, Domain/Procurement) | `ProcurementDbContext`, `procurement` schema, own history table | `web/stockpilot-web` (Procurement pages) | `mobile-flutter/lib/procurement` | Procurement Coordinator: `api/agent-workflows` |

So today there are **2 API hosts, 4 DbContexts, 4 migration histories, 2 React apps with different
stacks and themes, and 1 Flutter app** covering 2 of the 4 modules.

## 2. Plan

### 2.1 Backend: one host, one DbContext, one migration history
1. Host everything in `backend/StockPilot.API`. Reference Student 3's `StockPilot.Domain`,
   `StockPilot.Application` and `StockPilot.Infrastructure` projects unchanged, and register their
   services from the shared composition root. Retire the `backend/src/StockPilot.Api` host (its
   controllers move into the shared host unchanged apart from namespace/route glue).
   **Done:** the separate host is removed; `StockPilot.API` references the Supplier projects, registers
   their services and migrates the Supplier context at startup. The four DbContexts and migration
   histories are unchanged (steps 2–3 still open, pending D2).
2. One `StockPilotPlatformDbContext` that applies every module's existing
   `IEntityTypeConfiguration`s, so each module keeps its table names, schema, keys, precision and
   CHECK constraints exactly. Each module's repositories keep depending on the interface/context
   type they use today, served by the shared context (adapter registrations only).
3. One migration history: a single baseline migration generated from the combined model, replacing
   the four histories (see decision D2).
4. One auth pipeline (Inventory's JWT login), one exception-handling pipeline, one Swagger, one
   CORS policy.
5. **Done (see §3.2):** Replace Procurement's in-memory stand-ins (`IProductCatalogService`,
   `ISupplierDirectoryService`, `IBranchDirectoryService`, `IInventoryStockUpdater`) with adapters
   over the real Inventory and Supplier modules. The interfaces are Procurement's documented
   integration contract, so this is DI glue. The supplier/quotation adapter depends on D1.

### 2.2 React: one app shell — **implemented 2026-09-28**
`web/stockpilot-web` is the only React app. The separate `web/src` app (TSX, Tailwind, React 19) was merged in
and removed.

What moved in (as `src/modules/*`, each keeping its original file layout so the module code is unchanged):

| Module | Pages | Route |
| --- | --- | --- |
| Sales & Demand (S2) | Sales dashboard: forecast curve, activity pipeline, top sellers, trends, branch/category insights, customer behaviour, reorder alerts, sales ledger, Record Sale, Run Forecast, agent trace | `/sales` |
| Supplier Management (S3) | Overview, Suppliers, Quotations, Evaluation | `/suppliers/overview`, `/suppliers`, `/quotations`, `/evaluation` |
| Inventory (S1) | User administration (BusinessOwner) | `/users` |

What didn't move, and why:
- S1's TSX dashboards, Login and Profile in `web/src`: TSX ports of pages the shell already has (same titles and
  API calls); the shell's versions also include the Store Employee dashboard.
- `Home.tsx`'s role switch: S1 had added a switch that sent every role to those dashboards, which made S3's
  Supplier overview unreachable. The shell's `RoleBasedDashboard` does the role routing; the overview is now its own page.

S2's Sales UI had been lost: it was the whole `App.tsx` of `feature/Sales_and_Demand`, and S3's `App.tsx` replaced it
when the branches merged, so its components were left unused. It was restored from S2's branch as
`SalesDashboardPage`. Only the module's own app chrome was removed (sidebar, tab switch, placeholder panels for the
other modules). Its "Dispatch to Procurement Agent" `alert()` stub now opens the Replenishment orchestrator,
prefilled with the reorder suggestion's branch and product.

Integration glue:
- **API:**
  - The modules call the API through the shell's axios client, which supplies the base URL, the signed-in user's
    JWT and 401 handling.
  - S3/S1 pages use an adapter with `web/src`'s `apiClient` interface (`modules/shared/apiClient.ts`).
  - S2's service keeps its `/api/v1` prefix.
- **Auth:** the Users page uses the shell's `useAuth`.
- **One theme:**
  - Tailwind 4 utilities without Tailwind's global reset. The shell's element resets moved into `@layer base`;
    every shell class keeps its precedence.
  - Utilities are generated only from `src/modules`. None of the 349 generated utilities matches a class name used
    in the shell's JSX.
  - Tailwind's gray scale maps to the shell's slate palette.
  - Fonts and radii come from the shell's tokens.
  - `dark:` variants apply only under `.dark`, which the shell never sets.
  - S2's stylesheet is scoped under `.sales-module`, with its variables mapped to the shell's tokens. Rules the
    shell owns (`.btn`, `.btn-primary/-secondary`, `.badge` base, `.modal-overlay`) come from the shell.
- **Navigation:** sidebar sections for Sales & Demand, Supplier Management and Administration (BusinessOwner), with
  breadcrumb titles.
- **Loading:** the module pages are lazy-loaded, so the main bundle stays at its previous size (419 kB vs 415 kB;
  the Sales charting library loads only on `/sales`).
- **Also fixed** (pre-existing, found during the visual check): S1's commit `8222522` had deleted the `.main-area`,
  `.topbar`, `.topbar-left/-right`, `.topbar-breadcrumbs` and `.mobile-menu-btn` rules that `AppLayout.jsx` still
  uses, leaving the top bar unstyled on every page. Restored unchanged from `8222522^`.

Verified: React tests 47/47 (new `mergedModules.test.tsx` covers the Sales page and its hand-off, the Supplier page
over the shell client with the JWT, and S1's Users test ported to the shell harness); production build; the
cross-platform E2E passes; and a manual check in Chrome against the dev API (Sales, Supplier overview, Suppliers,
Users and the Inventory dashboard) with no console errors.

### 2.3 Flutter: one app shell
`mobile-flutter` is already the shell (login, secure token, role-based bottom navigation). Add a
shared `ThemeData` built from the same tokens as the web theme, and a navigation registry per
module, so each module contributes its tabs by role. Inventory and Supplier contribute nothing yet
(decision D4).

### 2.4 Multi-agent orchestration — **implemented 2026-09-27**
`ReplenishmentOrchestrator` (`backend/StockPilot.API/Application/AgenticAI/Orchestrator`), exposed at
`POST /api/agent-workflows/replenishment/start` and `GET /api/agent-workflows/replenishment/{workflowId}`.
It calls the four existing agents through their current entry points and adds nothing to their reasoning.
The step order is fixed and each edge is a plain condition on the previous agent's output; no model picks the next step.

1. **Plan**: validate the objective `{ branchId, productId, forecastDays?, leadTimeDays? }` against
   `agentic-ai/contracts/replenishment-orchestrator/workflow-input.schema.json`, then load the branch, product and stock.
2. **Delegate: Inventory Optimization Agent** (S1, `IInventoryOptimizationService`) decides between no action,
   a transfer and a reorder.
   - If the agent skips the product because a pending recommendation already exists, that pending recommendation is used.
   - No action: the run ends with `NoActionRequired`.
   - Transfer: the run ends with `TransferRecommended`, waiting for approval in the Inventory module.
3. **Delegate: Demand Forecast Agent** (S2, `IDemandForecastAgent`) sizes the reorder (D12). Its output is
   checked against `demand-forecast-agent-contract.json`. If the forecast quantity is below 1, the run ends with
   `QuantityConflict` for a human to decide.
4. **Delegate: Supplier Evaluation Agent** (S3, `ISupplierEvaluationService` → Python engine) picks the quotation (D11).
   - The pick is checked against `supplier-evaluation-output.schema.json` and must be one of the agent's eligible candidates.
   - No pick: the run ends with `NoEligibleSupplier`.
5. **Delegate: Procurement Coordinator Agent** (S4, `IProcurementCoordinatorAgent`) runs its budget and rule checks
   and creates the proposal.
   - The hand-off `{ triggerType, productId, branchId, suggestedQuantity, candidateSupplierId, quotationId, sourceAgent }`
     is first checked against S4's `workflow-input.schema.json`.
   - The run ends with `PendingApproval`, `ChecksFailed` or `Failed`.
6. **Validate**: every hand-off and the run's own output (`workflow-output.schema.json`) are checked, and each
   check is recorded as a validation result.
7. **Approve**: the orchestrator never approves. Proposals are approved through S4's existing endpoints
   (web/mobile, or `POST /api/agent-workflows/{procurementWorkflowId}/approve`), and transfers through S1's
   `POST /api/optimization/recommendations/{id}/approve`.
8. **Result**: one `AgentWorkflowAudits` row (`AgentName = ReplenishmentOrchestrator`), checkpointed after every step.
   - It links each agent's own record: the inventory recommendation, the forecast workflow and the procurement workflow.
   - `GET …/{workflowId}` returns the plan, tool calls, validations and the live status of the proposal.
9. **Roles**: BranchManager, ProcurementManager and BusinessOwner, the roles allowed to trigger every agent the orchestrator calls.

Tests:
- `ReplenishmentOrchestratorTests`: 18 cases, plus the 9 golden cases in
  `agentic-ai/evaluation/golden-cases/replenishment-orchestrator.golden.json`. The agents are fakes; the contract
  validators and contract files are the real ones.
- Live run on PostgreSQL with the four real agents and the Development demo data (`PlatformDemoDataSeeder`):
  - Paracetamol @ Colombo: Reorder. Inventory shortage 110, forecast quantity 293, Supplier Evaluation picked
    Acme (QT-DEMO-005, score 95.8), proposal created at PendingApproval. All 8 validations passed. After
    S4's approve endpoint, `GET` reports the proposal as Approved.
  - Vitamin C @ Colombo gives `TransferRecommended`, Amoxicillin gives `NoActionRequired`, and an invalid objective gives 422.

Clients and end-to-end: started from the React Replenishment page and the Flutter Replenishment screen (§3.3).
The cross-platform E2E (`scripts/e2e/run-replenishment-e2e.sh`) starts through the orchestrator (§5).

## 3. Conflicts needing a team decision

| # | Conflict | Between | Why it can't be merged silently | Options |
| --- | --- | --- | --- | --- |
| D1 | **Two `Product` entities.** Inventory `Products` (`ProductId`, SKU, CategoryId, stock levels, prices) vs Supplier `products` (`Id`, SKU, free-text Category, Brand, Model). Supplier quotations reference the Supplier table. | S1 vs S3 | Picking one changes the other's schema and FKs. Until they agree, a quotation's ProductId won't match an inventory product, so Supplier Evaluation → Procurement can't be chained with real data. | (a) Inventory `Products` is canonical and S3's quotations reference it; (b) keep both and add a SKU-based mapping; (c) keep both for now and have the orchestrator map by SKU at runtime (glue only, can fail on missing SKUs) |
| D2 | **Four migration histories into one.** Procurement kept its own `procurement.__EFMigrationsHistory` (set in its DI setup, not recorded in ADR-004); Supplier uses snake_case tables while the others use PascalCase. | all | One history means a new baseline migration; existing local databases must be recreated. Table naming stays as each module chose. | (a) new baseline, recreate dev DBs; (b) keep separate histories (doesn't meet requirement 1) |
| D3 | **Supplier API has no authentication**; every other module requires JWT with roles. | S3 vs all | Putting it behind auth changes who can call it. Leaving it open exposes supplier and quotation writes. | (a) require login for all, roles decided by S3; (b) reads open, writes need ProcurementManager/BusinessOwner; (c) leave open |
| D4 | **No Inventory or Supplier Flutter screens exist.** Inventory's mobile work was an Expo app, removed in `eaa2985`. | S1, S3 | Building screens is feature work, not integration. | (a) S1/S3 build Flutter screens and plug into the nav registry; (b) placeholder tabs; (c) mobile covers Sales + Procurement only |
| D5 | **Two classes named `StockPilotDbContext`** (Sales: `…Infrastructure.Persistence`; Supplier: `…Infrastructure.Data`), and overlapping root namespaces `StockPilot.Domain/Application/Infrastructure` across both backends. | S2 vs S3 | Both compile today only because they're in separate hosts; renaming a module's class is a change to that module. | Integration keeps both names, qualifies them in the composition root, and the shared context serves both. A rename is optional later. |
| D6 | **`api/products` route collision** — *interim: Supplier's endpoints moved to `api/supplier-products` (option b/c), `web/src/services/productService.ts` updated; revisit with D1*: Inventory `ProductsController` and Supplier `ProductsController`. | S1 vs S3 | Two actions on one route fail at startup; changing a route breaks that module's client. | Resolved with D1: under (a) the Supplier product endpoints are removed; under (b)/(c) Supplier's move to `api/supplier-products` and its web page's service is updated. |
| D7 | **Committed secrets**: `backend/src/StockPilot.Api/appsettings.json` (DB password), and the dev JWT signing key in `StockPilot.API/appsettings.json`. | S3, S1 | Values have to rotate; removing them changes each module's local setup. | Move to user secrets / environment variables; rotate the DB password. |
| D8 | **Two dev ports and base URLs** — *done: one host on :5004; `web/src` proxy retargeted* (`web/src` proxied to :5030; stockpilot-web → :5257 / .env :5004; Flutter → :5004). | S2, S3 vs S1, S4 | Configuration only. | Standardise on the shared host's port (glue; listed for visibility). |
| D9 | **`Program.cs` seeds dev users before applying migrations**, so Development mode fails on an empty database. | S1 | Startup order belongs to the Inventory/auth owner. | Move seeding after migrations. |

### 3.1 Decisions D1–D4 (approved 2026-09-27)

Status key: **Implemented** = done in `integration/unified-platform` and verified. **Sign-off pending** =
the named owner still has to confirm; record it here with the date.

#### D1: One merged `Product` entity. Status: **Implemented — confirmed**
Decision: keep the single `StockPilot.Domain.Entities.Product` (table `products`, key `Id`) holding
Supplier's fields (`Category`, `Brand`, `Model`) and Inventory's (`Barcode`, `Description`, `Unit`,
prices, stock levels, `CategoryId`).

The first verification found that the merge had removed Inventory's product functionality:
- Inventory's `ProductService` was deleted.
- `PUT`/`DELETE api/products` were gone.
- Inventory's validation no longer ran.
- `Description` was dropped.
- Supplier's endpoint had moved onto `api/products`.

Fixed as integration glue:

| Item | Now |
| --- | --- |
| `api/products` | Student 1's `ProductsController` and `ProductService` restored unchanged apart from context/key/navigation names (`Controllers/Inventory/ProductsController.cs`, `src/StockPilot.Infrastructure/Services/ProductService.cs`, `IProductService` in `StockPilot.Application.Interfaces`). GET all (`includeInactive`) / by id / by barcode, POST, PUT, DELETE (deactivate). Writes: roles `BusinessOwner,ProcurementManager` as before. `ApiResponse<ProductDto>` envelope as before. |
| Inventory validation | Restored: name/SKU required, prices and stock levels ≥ 0, category must exist and be active, unique SKU/barcode (service + controller `ValidationProblem`), DTO annotations (`Unit` required, `Description` ≤ 1000). |
| `Description` | Back on the entity (`text`, nullable, as in Student 1's original mapping). |
| `api/supplier-products` | Student 3's `SupplierProductsController` restored at its own route; `web/src/services/productService.ts` points back to it. |
| Tests | `CombinedProductTests` (26 cases) covers Student 1's service and controller, both modules reading and writing the one table, shared SKU uniqueness, and route/role checks. Student 3's `ProductsControllerTests` restored to target `SupplierProductsController`. Student 1's `InventoryOptimizationServiceTests` restored. |

Schema effects each owner must sign off:

- **S1 (Inventory)**
  - Table `Products`/`ProductId` becomes `products`/`Id`, and the FKs from `Inventories`, `Batches`, `StockMovements`, `StockTransferItems` and `AiRecommendations` now point at `products.Id`.
  - `CategoryId` is nullable in the database, because Supplier-created products have no Inventory category. The service still requires it for every product created or updated through `api/products`.
  - `GET api/products` also lists products created through `api/supplier-products`, with `categoryId` = empty GUID and `categoryName` = "".
- **S3 (Supplier)**
  - `Name` max length goes from 200 to 300 (Inventory's value).
  - `SKU` becomes unique across both modules.
  - New CHECK constraints: prices and stock levels ≥ 0 (default 0 for supplier-created rows).
  - Products created in Inventory appear in `api/supplier-products`.
- **Correction to the earlier review:** `Unit`, `Category`, `Brand` and `Model` are still `NOT NULL`, because the projects have nullable reference types enabled. Only `CategoryId` became nullable.

Sign-off: confirmed — all team members completed their parts (2026-09-27).

#### D2: One shared DbContext and one migration history. Status: **Implemented**
- `StockPilotPlatformDbContext` (`backend/StockPilot.API/Infrastructure/Platform`) is the only registered
  DbContext. It derives from Supplier/Inventory's `StockPilot.Infrastructure.Data.StockPilotDbContext` and
  implements Sales' `IApplicationDbContext` and Procurement's new `IProcurementDbContext`, so every module
  keeps injecting the type it used before (one instance per request).
- It applies each module's own configurations with the same namespace filters their former contexts
  used. Table names and casing are unchanged: Supplier snake_case, others PascalCase, Procurement in the
  `procurement` schema. Seed data, CHECK constraints and `xmin` row versions are unchanged.
- Removed: Sales' `StockPilot.Infrastructure.Persistence.StockPilotDbContext`, `ProcurementDbContext`, and
  all three old migration folders (this also resolves D5 for the context classes).
- One migration: `Infrastructure/Platform/Migrations/…_PlatformBaseline`, 26 tables, history in
  `public."__EFMigrationsHistory"`. `dotnet ef migrations has-pending-model-changes`: none.
- One connection string: `DATABASE_URL` if set, else `ConnectionStrings:DefaultConnection` (Procurement's
  resolver). One in-memory database for local runs without PostgreSQL.
- ADR-004 amended. `PostgresProcurementFixture`, `ProcurementApiFactory`, Sales tests and
  `scripts/e2e/run-procurement-cross-client.sh` (now `run-replenishment-e2e.sh`) updated. The E2E script now starts the API once, because
  D9 is fixed (seeding already runs after migration), and it asserts there is a single history table.
- Verified on PostgreSQL 18:
  - Procurement suite 180 passed / 1 skipped (the optional LLM judge), including all 15 PostgreSQL integration tests.
  - A fresh database boots with 1 history row, 27 tables (26 + history), 4 dev users, 190 sales and 1 budget.
  - The full cross-client E2E script passes on the baseline, after D10.
- **Action for everyone:** drop and recreate your local `stockpilotdb`. The API migrates it on first start:
  `psql -U postgres -c "DROP DATABASE IF EXISTS stockpilotdb WITH (FORCE)" -c "CREATE DATABASE stockpilotdb"`.
- To add a later migration: `dotnet ef migrations add <Name> --project backend/StockPilot.Api --context AppDbContext --output-dir Shared/Data/Migrations --namespace StockPilot.Shared.Data.Migrations` (paths updated for §6).
  One folder for all students, so coordinate before adding one.

#### D3: Supplier API authentication, option (b). Status: **Implemented — confirmed**
All Supplier controllers (`Suppliers`, `Quotations`, `SupplierEvaluation`, `supplier-products`) need login.
`GET` actions need no role. Writes and `POST SupplierEvaluation/evaluate` need `ProcurementManage`
(BusinessOwner, ProcurementManager). Covered by `CombinedProductTests` and checked on the live API:
StoreEmployee `GET /api/Suppliers` gives 200, and `POST /api/Suppliers` or `/api/supplier-products` gives 403.
Role mapping confirmed (2026-09-27).

#### D4: Flutter screens. Status: **Decided — Inventory screens adopted and aligned (§3.3); no Supplier tab until S3 delivers screens**
- S1 reviews and adopts the new Inventory Flutter screens (`features/inventory`, `products`, `batches`,
  `stock_movements`, `transfers`, `scanner`, `ai_insights`). S1 adopted (2026-09-27); client fixes in §3.3.
- Found for that review: these screens read `/api/products` and `/api/branches` as bare lists or objects
  with `id`, but Student 1's API returns `ApiResponse` (`{ success, data }`) with `productId`/`branchId`.
  The barcode lookup screen also expected SKU/name matching, which the removed stand-in controller did
  and Student 1's endpoint does not. The screens need adapting to Student 1's contract as part of S1's
  review. The API contract is not changed to fit them.
- S3 builds the Supplier Flutter screens. No Supplier tab until then (none exists today).

#### D10: Login request contract. Status: **Resolved (a), 2026-09-27**
Student 1's `LoginRequestDto` took `{ username, password }`. The staged integration work renamed it to
`{ emailOrUsername, password }` so the login also accepts an email. The Flutter app, `web/stockpilot-web` and
the Flutter E2E test still sent `username` and got HTTP 400.
Decision: keep `emailOrUsername` and update the clients. Changed only the request field:
- `mobile-flutter/lib/features/auth/providers/auth_provider.dart`
- `web/stockpilot-web/src/api/authApi.js`
- The Flutter E2E and `agent_workflow_api_test.dart` login payloads.

The Flutter E2E test also now mocks `flutter_secure_storage`. The shared `ApiClient` reads the token from
it, and the plugin has no implementation under `flutter test`.
Verified:
- Flutter tests pass (30, plus 2 skipped E2E-stage tests).
- `stockpilot-web` unit tests 38/38.
- `scripts/e2e/run-procurement-cross-client.sh` (since replaced by `run-replenishment-e2e.sh`) PASS on PostgreSQL 18: Flutter login → agent proposal →
  React approval → Flutter sees Approved (database `stockpilot_e2e_20260927194337`).

### 3.2 Orchestrator integration decisions: D11–D15 (final, 2026-09-27)

All team members have completed their parts. The decisions below are final; no further confirmation is pending.

#### D11: Supplier Evaluation's pick was dropped at the C# boundary. Status: **Final — implemented**
The Python agent returns `selectedSupplierId`, `selectedQuotationId` and `reasonSummary`
(`supplier-evaluation-output.schema.json`). `AgenticAiIntegrationService` deserialized that output into
`SupplierEvaluationResponseDto`, which had no such fields, so the agent's choice was lost.
Decision: three optional properties on `SupplierEvaluationResponseDto`, passed through by
`SupplierEvaluationService.EvaluateQuotationsAsync`. Additive only; no scoring, eligibility or selection change.

#### D12: Two agents produce an order quantity. Status: **Final — Inventory triggers, Forecast sizes**
- Inventory Optimization decides whether to act and whether it's a transfer or a reorder.
- The forecast's `RecommendedReorderQuantity`, rounded up, is the order size; `sourceAgent = DemandForecastAgent`.
- A forecast quantity below 1 ends the run with `QuantityConflict` for a human.
- Both numbers are recorded in the trace.
- The forecast may order less than the shortage to the reorder level (golden case
  `forecast-sizes-even-when-smaller-than-shortage`).

#### D13: Sales & Demand endpoints authorization. Status: **Final — option (b), implemented**
- All three controllers (`api/v1/agent`, `api/v1/demand`, `api/v1/Sales`) require login.
- Running a forecast or the agent (`POST demand-forecast/run`, `POST golden-cases/evaluate`, `POST demand/generate`)
  requires BranchManager, ProcurementManager or BusinessOwner.
- Reads and recording a POS sale are open to any logged-in user, including StoreEmployee.

Client glue:
- `web/src/services/api.ts` (its own axios instance) now sends the signed-in user's token.
- The Flutter Sales service regains the `/api/v1` prefix the original service used; its port had dropped it,
  so POS Sale and Demand Alerts were calling routes that don't exist.

Tests: `SalesAuthorizationTests` (4). Live check on the API: anonymous gets 401; StoreEmployee reads get 200
and a POS sale is accepted (400 on an empty body, i.e. authorized); StoreEmployee forecast runs get 403;
a Procurement Manager's forecast run gets 200.

#### D14: Receiving a purchase order updates inventory. Status: **Final — creates an Inventory batch**
`InventoryStockReceivingAdapter` implements Procurement's `IInventoryStockUpdater`. Each received PO line calls
Student 1's own `IBatchService.CreateAsync`, so stock, the stock movement and branch-access rules follow
Inventory's logic:
- Batch number `{OrderNumber}-L{line}`.
- Quantity received, unit cost from the PO line, received now, no expiry (editable in Inventory).
- Idempotent per line: Procurement calls it before its own status transaction, so a retried receipt doesn't double-count.
- Inventory's errors map to Procurement's 403/400/409.

Procurement's own tests keep the no-op stand-in; `InventoryStockReceivingAdapterTests` (4) cover the adapter.

#### D15 (found while integrating the clients): manual stock adjustments. Status: **Clients aligned to the owner's backend**
Student 1's current backend (`92b538a`) allows only `Adjustment` (1) and `WriteOff` (4) for manual adjustments,
and both decrease stock. The clients were out of date:
- Student 1's React Stock Movements form sent values 2, 3, 6 and 8 from an older enum, all rejected.
- The Flutter adjustment screen labelled value 4 "Initial / Restock (Increase)", although 4 is a write-off.

Following the rule used for D10 and the inventory routes (the owner's current backend contract wins), both
clients now offer only Adjustment (decrease/correction) and Write-off. Stock increases come from receiving
batches (Receive Batch, or a received purchase order, D14).

Left for Student 1: if manual increases or returns should exist, that is a backend change in their module.
The Stock Movements history filter still lists the older type names.

#### Procurement's cross-module stand-ins replaced (plan §2.1 step 5). Status: **Implemented**
Read-only adapters (`Infrastructure/Platform/Adapters`) serve Procurement's product, branch, supplier and
quotation lookups from the real Inventory and Supplier tables; D14 covers stock receiving. The Supplier module
has no quotation notes, so `Notes` is null in the real data; Procurement's golden cases still use their stand-ins.
`PlatformDemoDataSeeder` (Development only) inserts the rows the other seeds already referenced by id, plus
the stock and quotation scenario used by the orchestrator and the E2E run.

### 3.3 Client integration and regressions fixed (2026-09-27)

**Orchestrator in the React app** (`web/stockpilot-web`):
- A **Replenishment Agent** page at `/procurement/replenishment` and `/procurement/replenishment/:workflowId`,
  with a sidebar link under Procurement, for BranchManager, ProcurementManager and BusinessOwner.
- The user picks a branch and product and runs the check. The page shows the outcome, the order/forecast/shortage
  numbers, the selected quotation, the proposal link with its live status, the six agent steps and the contract checks.
- ProcurementManager/BusinessOwner can approve through S4's workflow-approve endpoint; "Review / reject"
  opens the proposal.
- Built on `replenishmentApi` in `procurementApi.js`. Tests: `ReplenishmentPage.test.jsx` (6).

**Orchestrator in the Flutter app**:
- A **Replenishment Agent** tile (Branch Manager dashboard) opens `ReplenishmentScreen`. The user picks a
  branch (preselected from their own) and a product and runs the check. The screen shows the outcome and agent
  steps, and "Refresh status" follows the proposal's live status. Approval stays with managers on web.
- `ProcurementApiService.startReplenishment` / `getReplenishment`. Tests: `replenishment_test.dart` (6).

Integration regressions found and fixed along the way:

| Regression | Fix |
| --- | --- |
| Flutter: Student 2's POS Sale and Demand Alerts screens and Student 4's Purchase Orders screen weren't reachable from any route or dashboard after the shell restructure | Routes `/sales/pos`, `/sales/demand-alerts` and `/procurement/orders`, plus dashboard tiles (Branch Manager and Store Employee), as in the original app |
| Flutter: Student 4's proposal-decision watcher was never started, and its local notifications had been removed (placeholders) | Notification service restored unchanged, `flutter_local_notifications` re-added, and the watcher started/stopped by the app shell for proposal-raiser roles |
| Flutter: agent workflow 422/503 results were turned into exceptions by the shared `ApiClient`, losing the result. The Procurement test had been rewritten to expect this | `ApiException` keeps the response body; workflow calls return the result again; Student 4's original test restored |
| React (both apps): `inventoryApi.getByBranch` / `getByBranchAndProduct` called routes Student 1's current backend no longer serves (`/api/inventory/{branch}` became `/api/inventory/branch/{branch}`) | Client routes updated to the owner's current contract |
| Flutter: seven Inventory screens read bare lists and `id`, but Student 1 returns `{ success, data }` with `productId`/`stockTransferId`. Two posted to `/api/stockmovements` and one called `/api/inventoryoptimization` (neither route exists) | Shared `unwrapList`/`unwrapObject` helper; field names, routes and payloads (`CreateBatchDto`, `CreateAdjustmentDto`) aligned with Student 1's DTOs; D15 labels |
| React Stock Movements form sent adjustment types the backend rejects | D15 |
| Flutter Sales service called `/api/Sales` and `/api/demand/...` (the port dropped the original `/api/v1` base) | Paths restored to `/api/v1/...` (D13) |

#### Environment notes
- The Supplier Evaluation agent needs `pip install -r agentic-ai/requirements.txt`: it imports `openai` even in
  deterministic mode.
- `agentic-ai/tests/test_contracts.py` needs `pytest`, which is not in `requirements.txt` (install it to run the full
  Python suite: 37 tests).
- The bridge resolved `AgenticAi:WorkingDirectory` against the process's current directory. `Program.cs` now pins it to
  the repository's `agentic-ai` folder when the configured path doesn't point there.

## 4. Order of work
1. ~~Record D1–D4 answers here.~~ Done (§3.1), confirmed.
2. ~~Backend composition (2.1), with every existing test suite kept green.~~ Done (D1, D2, D10).
3. ~~Orchestrator (2.4) and its golden cases.~~ Done (§2.4, D11–D14).
4. ~~Orchestrator in the React and Flutter apps; navigation regressions fixed.~~ Done (§3.3).
5. ~~Cross-platform E2E through the orchestrator.~~ Done (§5).
6. ~~Merge `web/src` into the `web/stockpilot-web` shell (2.2).~~ Done; `web/src` removed.

## 5. Final test results (2026-09-27)

All run on the `integration/unified-platform` branch, PostgreSQL 18 local.

| Suite | Result |
| --- | --- |
| Backend `StockPilot.Api.Tests` (Inventory, Supplier, D1 products, orchestrator + 9 golden cases, D14 adapter, D13 authorization) | 170 / 170 |
| Backend `StockPilot.Tests` (Sales & Demand) | 10 / 10 |
| Backend `StockPilot.Procurement.Tests` with PostgreSQL integration tests enabled | 180 passed, 1 skipped (optional LLM judge) |
| Python Supplier Evaluation agent (`pytest`) | 37 / 37 |
| React `web/stockpilot-web` (vitest), incl. merged Sales/Supplier/Users modules | 47 / 47; production build OK |
| Flutter (`flutter test`, `flutter analyze` clean) | 36 passed, 1 skipped (E2E-only stage) |
| Cross-platform E2E `scripts/e2e/run-replenishment-e2e.sh` | **PASS**, database `stockpilot_e2e_20260927204331`; re-run after D13: PASS (`stockpilot_e2e_20260927205605`); after the React merge: PASS (`stockpilot_e2e_20260928000635`) |

E2E path:
1. React Replenishment page (Procurement Manager) → API → Replenishment Orchestrator.
2. The four real agents: Inventory Optimization, Demand Forecast, Supplier Evaluation (Python) and Procurement Coordinator.
3. PostgreSQL: the proposal waits at PendingApproval.
4. React (Business Owner) approves; the proposal becomes `PO-2026-000002` and is received.
5. Inventory batch `PO-2026-000002-L1`; Colombo stock 40 → 293 + 40 = 333.
6. Flutter (Branch Manager) sees proposal Converted and order Received.

Details: `docs/testing/procurement-testing.md`.

## 6. Repository structure (2026-09-28)

The repository follows the agreed module layout (see the root `README.md`). Code was moved with `git mv`, so
`git log --follow` shows each file's history back to its original author. File contents and C# namespaces are
unchanged; only locations changed, plus the import paths the moves require. The four students' work was already
in this one repository, as branches, so no cross-repository merge was needed.

| Before | Now |
| --- | --- |
| `backend/StockPilot.API` + `backend/src/StockPilot.{Domain,Application,Infrastructure}` (3 class libraries) | one project, `backend/StockPilot.Api`, with `Modules/{Inventory,SalesDemand,Suppliers,Procurement}` (src files placed by original author) |
| JWT and policies inline in `Program.cs` | `Shared/Identity/StockPilotIdentity.cs` (`AddStockPilotIdentity`) |
| `StockPilotPlatformDbContext` (`Infrastructure/Platform`) | `Shared/Data/AppDbContext.cs`, migrations in `Shared/Data/Migrations` (EF model unchanged: no pending changes) |
| `Application/AgenticAI/Orchestrator` | `Shared/Agents/Orchestrator` (with its controller); agents stay in their modules |
| `Infrastructure/Platform/Adapters` | `Shared/Integration` |
| `web/stockpilot-web/src/{pages,components,context,styles}` | `web/src/modules/{inventory,sales-demand,suppliers,procurement}`, `web/src/shared/{theme,layout,navigation,auth,api}` |
| `mobile-flutter/lib/{features,core/theme,app_router.dart}` | `mobile/lib/modules/{inventory,sales_demand,procurement}`, `mobile/lib/shared/{theme,navigation,auth}` |
| `agentic-ai/src` | `agentic-ai/agents/supplier_evaluation` (run with `-m agents.supplier_evaluation`) |

Notes:
- **One DbContext.** `AppDbContext` is the only registered DbContext. It still derives from the Inventory/Supplier
  context type (`Modules/Suppliers/Infrastructure/Data/StockPilotDbContext.cs`), so those services keep injecting the
  type they were written against (D2). With every module in one assembly, that context's configuration scan is limited
  to its own namespace, as it was when it had its own assembly.
- **agentic-ai.** Only the Supplier Evaluation Agent is Python. The Inventory Optimization, Demand Forecast and
  Procurement Coordinator agents, and the orchestrator, are in-process C# in the API, so there are no Python folders
  for them; `agentic-ai/README.md` maps each one to its code.
- **Mobile modules.** There is no `suppliers` folder in the mobile app until Student 3's Flutter screens exist (D4).
- **Current user.** Inventory and Procurement each keep their own current-user service; both read the same JWT claims.

Verified after the restructure:
- Api 170, Sales 10, and Procurement 180 on PostgreSQL.
- Python 37, web 47, Flutter 36; `flutter analyze` clean.
- The cross-platform E2E passes (`stockpilot_e2e_20260928003201`).

