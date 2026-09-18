# ADR-004: Procurement Module Persistence Conventions

- Status: Accepted
- Date: 2026-09-18
- Owners: Procurement module (Kirush29)

## Context

The Procurement module (`StockPilot.Procurement.*`) persists to the same PostgreSQL database
(via Npgsql.EntityFrameworkCore.PostgreSQL) as the rest of StockPilot. Initial scaffolding used
EF Core defaults (`decimal` mapped at `numeric(18,2)`, plain string-backed enums with no DB-level
enforcement) which don't reflect the actual value ranges or give the database a way to reject bad
data written outside the API (migrations, manual fixes, a future second writer).

## Options considered

**Money type:** `numeric(18,2)` (EF default) vs `numeric(12,2)` vs `money`.
`money` is Postgres-specific, locale-dependent, and doesn't compose well with `decimal` in .NET.
`numeric(18,2)` allows values into the quadrillions, far beyond any budget, quotation, or order
this module will ever see. `numeric(12,2)` caps at ~9.99 billion, comfortably above the largest
plausible branch budget while catching a runaway multiplication (bad quantity × unit price) with
a hard DB error instead of a silently accepted value.

**Timestamps:** `timestamp` (no time zone) vs `timestamptz`.
The API layer, the rest of StockPilot, and every entity already use `DateTimeOffset`. `timestamp`
would silently drop the offset and make cross-branch/cross-timezone ordering ambiguous.
`timestamptz` stores an instant in UTC and is what Npgsql maps `DateTimeOffset` to by default; the
mapping is made explicit in each `IEntityTypeConfiguration` rather than left implicit.

**Enum storage:** native PostgreSQL `enum` type vs string-backed C# enum + CHECK constraint vs
bare integer.
A native PG `enum` type requires a schema migration (`ALTER TYPE ... ADD VALUE`) every time a
status is added and doesn't round-trip cleanly through `pg_dump`/EF's migration model as easily as
a plain column. A bare integer is compact but unreadable in `psql` and silently accepts any value.
String-backed enum (`HasConversion<string>()`) was already in use for readability in ad-hoc
queries; it was missing the CHECK constraint, so the column accepted any string.

## Decision

- All money columns (`Budget.AllocatedAmount/SpentAmount`, `ProcurementProposal.TotalEstimatedCost`,
  `ProposalLineItem.UnitPrice/LineTotal`, `PurchaseOrder.TotalCost`, `PurchaseOrderLineItem.UnitPrice`)
  use `HasPrecision(12, 2)` → `numeric(12,2)`.
- All `DateTimeOffset` columns are explicitly mapped with `HasColumnType("timestamptz")`.
- Status/decision enums stay string-backed C# enums (`HasConversion<string>().HasMaxLength(32)`)
  and each gets a `CHECK` constraint built from `Enum.GetNames<T>()`, so the constraint can never
  drift out of sync with the C# enum: `ProcurementProposal.Status`, `PurchaseOrder.Status`,
  `PurchaseOrderStatusHistory.FromStatus/ToStatus`, `ApprovalDecision.Decision`.
- Every table this module owns (`Budget`, `ProcurementProposal`, `ProposalLineItem`,
  `ApprovalDecision`, `PurchaseOrder`, `PurchaseOrderLineItem`, `PurchaseOrderStatusHistory`) has
  `CreatedAt`/`UpdatedAt`. On the three append-only audit tables (`ApprovalDecision`,
  `PurchaseOrderStatusHistory`, and the line-item tables) `UpdatedAt` is always equal to
  `CreatedAt` since rows are never mutated after insert — kept anyway so every table in the module
  can be queried/audited the same way without a special case.
- The write sequence "record a decision → change a status → adjust a budget" (proposal
  approve/reject/revise in `ProcurementProposalService.DecideAsync`; proposal→order conversion and
  the budget commit in `PurchaseOrderService.ConvertProposalAsync`; order cancellation refund in
  `PurchaseOrderService.UpdateStatusAsync`) is wrapped in `IUnitOfWork.ExecuteInTransactionAsync`,
  which opens an explicit `BeginTransactionAsync`/`CommitAsync` around Npgsql's execution strategy
  rather than relying on the single implicit transaction EF Core wraps around one `SaveChanges`
  call. This makes the atomicity requirement explicit in code (not just an accident of "everything
  happened to be one `SaveChanges` call") and keeps it correct if a step is later split into more
  than one write. Calls to other modules (e.g. `IInventoryStockUpdater`) are kept outside the
  transaction so a slow/unavailable external dependency never holds a DB lock open.

## Consequences

### Positive
- A bad multiplication or a bug that tries to write an unrecognized status now fails loudly at the
  database, not just in application code that happens to validate correctly today.
- `numeric(12,2)` and `timestamptz` are self-documenting in `psql`/`pg_dump` output.
- The CHECK constraints regenerate themselves from the enum, so adding a new `ProposalStatus`
  member only requires a migration, not a second place to remember to update.

### Negative / trade-offs
- `numeric(12,2)` would need a follow-up migration if StockPilot ever needs a single line item or
  budget above ~9.99 billion (considered unrealistic for this domain).
- The append-only tables carry an `UpdatedAt` column that never changes, which looks odd until you
  read this ADR.
- `ExecuteInTransactionAsync`'s execution-strategy retry means the delegate passed to it must be
  safe to run more than once; this is why external calls (`IInventoryStockUpdater`) are kept out of
  it.

## Viva notes
Be able to explain: why `numeric(12,2)` over the EF default `numeric(18,2)`; why string enum +
CHECK was chosen over a native PG enum type; why `UpdatedAt` sometimes never changes; and walk
through what happens (and what rolls back) if the budget update in `ConvertProposalAsync` throws
after the purchase order has already been added to the change tracker.
