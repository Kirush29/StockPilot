# Procurement module: tests

How to run each layer of the Procurement module's tests, what each covers, and the defects the
tests found. Owner: Procurement module (Kirush29).

## Running

| Layer | Command | Needs |
| --- | --- | --- |
| Backend unit, controller, agent, golden cases | `dotnet test backend/tests/StockPilot.Procurement.Tests` | nothing |
| PostgreSQL integration | same, with `STOCKPILOT_TEST_POSTGRES="Host=localhost;Port=5432;Username=postgres;Password=..."` | a PostgreSQL server the tests may create/drop databases on (skipped when unset) |
| LLM-as-judge evidence (optional) | same, with `STOCKPILOT_LLM_JUDGE_OPENAI_KEY=...` | OpenAI key (skipped when unset) |
| React | `cd web && npm test` | nothing |
| Flutter | `cd mobile && flutter test test/procurement` | nothing |
| Cross-platform end-to-end (multi-agent) | `scripts/e2e/run-replenishment-e2e.sh` (see header for env vars) | PostgreSQL, .NET 8, Flutter, Node, Python (`agentic-ai/requirements.txt`) |

Testcontainers is not used because the development machine has no Docker. The PostgreSQL tests
take any server via the connection string instead; a throwaway local cluster works:
`initdb -D <dir> -U postgres --auth=trust` then `pg_ctl -D <dir> -o "-p 55432" start`.

## What is covered

### Backend (`backend/tests/StockPilot.Procurement.Tests`)
- `Services/ProposalApprovalRulesTests`: budget math (multi-line totals, exactly-remaining allowed,
  one cent over rejected, other periods ignored), approval limits (50,000 / 50,000.01, unlimited
  BusinessOwner, no approval for BranchManager/StoreEmployee, highest limit across roles), proposal
  status transitions (each decision, no re-decision, revise and resubmit, no edits after a decision).
- `Services/PurchaseOrderConversionTests`: conversion copies lines and history, commits the exact
  cost, needs an active budget and Approved status; the full 4×4 order status transition matrix.
- `Validation/ProposalValidatorTests`: negative/zero quantity, negative price, no lines, empty ids,
  comment required unless approving.
- `Api/ProcurementEndpointAuthTests`: the real API over HTTP with signed JWTs per role.
  401/403/409/404 on `/decision`, `/convert` and the agent `/approve`; approval limit enforced by the
  policy; 400 for negative quantity and blocked supplier, 422 for over budget.
- `Integration/*` (PostgreSQL): real migrations and seed data; approval commits decision + status
  together; approve then convert commits order + status + `Budget.SpentAmount` together; a failing
  commit rolls all of it back (fault injected with a trigger); order cancellation refunds in the same
  transaction; concurrent conversions/decisions (one wins, the other gets a conflict; a shared budget
  never loses an update; different branches get distinct order numbers); order numbering after gaps;
  CHECK constraint and `numeric(12,2)` enforced by the database; the open-order lookup's SQL translation.
- `AgenticAI/ProcurementGoldenCaseTests`: runs the Coordinator Agent over the fixed scenario in
  `agentic-ai/evaluation/golden-cases/procurement-coordinator.golden.json` (7 cases) with rule-based
  and JSON Schema assertions only: exact plan, exact `CheckBudget` inputs, over-budget blocked,
  budget boundary allowed, never auto-approved, malicious quotation note ignored, only allow-listed
  tools. The LLM judge records supporting evidence for the injection case and cannot pass or fail it.

Note: approving a proposal does not change `Budget.SpentAmount`; spend is committed when an
Approved proposal is converted to a purchase order. The integration tests cover both transactions.

### React (`web`)
- `ProposalDetailPage.test.jsx`: Approve/Reject/Request Revision only for managers on a pending
  proposal; Convert only for managers once Approved; decision requests and payloads; 403 approval
  limit and 409 messages; conversion navigates to orders.
- `ProposalForm.test.jsx` (NewProposalForm): required fields, quantity -3/0/1.5, negative price,
  malformed GUIDs, typed payload on submit, Save as Draft, 422 and 400 server errors.
- `procurementApi.integration.test.js`: the real axios client against MSW-mocked endpoints: bearer
  token, query parameters, request bodies, ProblemDetails → field errors, 401 clears the session.

### Flutter (`mobile/test/procurement`)
- `purchase_order_status_screen_test.dart`, `delivery_receiving_screen_test.dart`: loading, empty,
  error/retry, filtering, scanning, quantity bounds, partial vs full receipt payloads.
- `receiving_navigation_test.dart`: Receive → receiving screen → confirm pops and refreshes; back
  without confirming does not.
- `procurement_api_service_test.dart`, `agent_workflow_api_test.dart`: the real service over
  `MockClient`: URLs, headers, JSON bodies, error messages, agent workflow start/status, login body.

### Cross-platform end-to-end (multi-agent replenishment)
`scripts/e2e/run-replenishment-e2e.sh` replaces the earlier Procurement-only run. The workflow starts in
the React app and goes through the Replenishment Orchestrator and all four real agents:

1. React (Procurement Manager) runs a check on the real Replenishment page. The orchestrator calls Inventory
   Optimization, then Demand Forecast, then Supplier Evaluation (Python agent), then the Procurement Coordinator,
   and stops at PendingApproval.
2. React (Business Owner) approves on the same page. The proposal is converted to a purchase order and
   received, which creates an Inventory batch (D14).
3. Flutter (Branch Manager) sees the final status.

It prints the orchestrator trace, the agents' rows, the decision, the order and the batch from PostgreSQL,
and writes `scripts/e2e/last-run.log`. Stages: `web/e2e/replenishment.e2e.test.jsx`
(`E2E_STAGE=initiate|approve`) and `mobile/test/e2e/replenishment_e2e_test.dart` (`verify`).

Recorded run, 2026-09-27, against local PostgreSQL 18 (database `stockpilot_e2e_20260927204331`):

| Stage | Result |
| --- | --- |
| 1. React, Procurement Manager, Replenishment page | Paracetamol @ Colombo: Reorder (Inventory shortage 110), forecast quantity 293, Supplier Evaluation picked quotation `c0000000-…0002` (Acme), proposal `85be4ba3-…` PendingApproval for 4,160.60. Four agent calls, all succeeded; every contract check passed. Vitamin C: TransferRecommended; Amoxicillin: NoActionRequired. A Branch Manager's approve attempt got 403. |
| PostgreSQL | one `ReplenishmentOrchestrator` row at `AwaitHumanApproval`, linking the inventory recommendation, forecast workflow and procurement workflow ids |
| 2. React, Business Owner | approved on the Replenishment page. `PO-2026-000002` created and Received, batch `PO-2026-000002-L1` (293 × 14.20); Colombo stock 40 → 333 |
| 3. Flutter, Branch Manager | sees the run with proposal Converted and order Received |
| PostgreSQL afterwards | proposal Converted, decision Approved ("Approved from the replenishment run"), order Received, batch and stock as above |

## Defects found by these tests

| Defect | Status | Test |
| --- | --- | --- |
| Two interleaved conversions of the same proposal both commit: two purchase orders and a double budget charge (no concurrency check on the proposal row) | Fixed: `xmin` row version on `ProcurementProposal` and `Budget`; the stale writer gets 409 | `ConcurrentConversions_OfSameProposal_ProduceOneOrder`, `ConcurrentConversions_SharingABudget_NeverLoseASpendUpdate`, `ConcurrentDecisions_OnSameProposal_RecordOnlyOne` |
| Order numbers are `COUNT + 1` per year: once any number is out of sequence, every later conversion that year fails on the unique index | Fixed: `MAX + 1` for the year, generated inside the conversion transaction under an advisory lock | `Conversion_StillSucceeds_AfterAGapInOrderNumbers`, `OrderNumber_IsOnePastTheHighestThisYear_IgnoringOtherFormats`, `ConcurrentConversions_InDifferentBranches_BothSucceed_WithDistinctOrderNumbers` |
| Flutter login sent `email`, the API reads `username`, so every mobile login failed | Fixed | `agent_workflow_api_test.dart` login test |
| Purchase Orders screen: badge + Receive button overflowed the list tile's 56 px trailing slot and clipped the button | Fixed (button moved to the subtitle row) | `purchase_order_status_screen_test.dart` |
| `Program.cs` seeds dev accounts before applying migrations, so Development mode can't start on an empty database | Fixed during integration (migrate, then seed); the E2E starts the API once | `run-replenishment-e2e.sh` |
