# ADR-005: Procurement Coordinator Agent

- Status: Accepted
- Date: 2026-09-26
- Owners: Procurement module (Kirush29)

## Context

StockPilot's Agentic AI subsystem has four agents with separate responsibilities:

| Agent | Responsibility |
| --- | --- |
| Demand Forecast | Predicts demand and reorder points from sales history |
| Inventory Optimization | Flags low-stock/overstock items and suggests quantities |
| Supplier Evaluation | Ranks suppliers/quotations for a product |
| **Procurement Coordinator** (this ADR) | Turns a reorder signal plus a chosen quotation into a budget-checked, rule-checked `ProcurementProposal`, then **stops at PendingApproval** |

The Coordinator is the only agent that writes procurement data. The marking rubric requires an
allow-listed tool set, schema-validated tool I/O, timeouts and bounded retries, a mandatory human
approval gate, a persisted execution trace, safe failure, and resistance to prompt injection
embedded in upstream data (e.g. a supplier's quotation note).

The team's existing agent work is split across two approaches: the Demand Forecast Agent is an
in-process C# workflow in `StockPilot.API` that writes its trace to `AgentWorkflowAudits`, and
`StockPilot.API` already references Semantic Kernel (used by `InventoryOptimizationService`
for LLM calls). The Supplier Evaluation decision engine is a small Python module (`agentic-ai/src`)
invoked over stdin/stdout. ADR-003 (team-level orchestration) is still a proposal.

## Options considered

1. **LangGraph service in Python** (`agentic-ai/`), calling back into the .NET API for each tool.
2. **Microsoft Agent Framework workflows** (graph executors, checkpointing, human-in-the-loop),
   added as a new NuGet dependency of `StockPilot.API`.
3. **In-process C# workflow graph in `StockPilot.API`**, matching the Demand Forecast Agent,
   with Semantic Kernel (already referenced) used only for an optional LLM step.

## Decision

Option 3.

- **Tools wrap existing C# services.** `CheckBudget` wraps `IBudgetService.CheckAvailabilityAsync`,
  `ValidateBusinessRules` wraps `IProcurementBusinessRuleService`, and `CreateProposal` wraps
  `IProcurementProposalService.CreateAsync`. In-process, the agent calls these directly, and the
  proposal service still re-checks everything on write. With LangGraph, every tool would be an
  authenticated HTTP call back into the API, so the Python process would need a service
  credential. That conflicts with "the agent never sees secrets" and adds network failure modes
  to each step.
- **Matches the team.** Same host, same `AgentWorkflowAudits` trace table and `WorkflowStateDto`
  shape as the Demand Forecast Agent. `GET /api/agent-workflows/{id}` therefore returns the same
  trace vocabulary the team already demos.
- **Why not Microsoft Agent Framework now.** It would be a new, fast-moving dependency added late
  in the project, for a 10-node graph. The hand-written graph uses the same concepts (nodes =
  executors, conditional edges, a checkpoint after every node, a human-in-the-loop terminal node),
  so porting it later is mechanical. Semantic Kernel is Agent Framework's predecessor and is
  already a dependency.
- **The LLM does not drive the workflow.** No model chooses the next node, chooses a tool, or
  supplies a number. The only LLM use is an optional justification paragraph (when an OpenAI
  key is configured). It gets no tools and sees only validated facts. Its draft is thrown away
  unless every number in it appears in the plan. Without a key, a deterministic template is used,
  so tests and demos are reproducible.

### Workflow graph

```
ValidateInput ──invalid──▶ Stop (InvalidInput)
   │
LoadQuotationContext → ScreenUntrustedContent → BuildPurchasingPlan → CheckBudget* → ValidateBusinessRules*
                                                                                          │
                                                          tool failure at any * ─────────▶ Stop (Failed)
                                                                                          │
                                                               EvaluateGate ──checks fail──▶ Stop (ChecksFailed)
                                                                    │
                                                  DraftJustification → CreateProposal* → AwaitHumanApproval (PendingApproval, terminal)
```

`*` = allow-listed tool call through `AgentToolGateway`.

### Controls and where they live

| Requirement | Implementation |
| --- | --- |
| Allow-list | `AgentToolGateway.AllowedTools` = {CheckBudget, ValidateBusinessRules, CreateProposal}. Tools registered under any other name are ignored; calls to them are refused and recorded. |
| Schema validation | Every tool input *and* output is validated against `agentic-ai/contracts/procurement-coordinator/*.schema.json`, embedded into the assembly (single source of truth). The workflow objective is validated too. |
| No invented numbers | Unit price comes from the quotation, and line totals are computed in code. `CheckBudget` does the budget arithmetic. The optional LLM narrative is rejected if it contains any number not in the plan. |
| Timeouts / retries | Per-attempt timeout (`Procurement:CoordinatorAgent:ToolTimeoutSeconds`). Up to 2 retries for idempotent (read) tools on timeouts and transient errors. `CreateProposal` is never retried, so a timeout can't create a duplicate. A timed-out tool that ignores cancellation is not retried (it may still hold the scoped DbContext). |
| Human gate | `CreateProposalTool` hard-codes `SubmitForApproval: true`. Its output schema pins `status` to `"PendingApproval"`, so a tool reporting `Approved` fails validation. The agent has no dependency on `IPurchaseOrderService`. Approval is only `POST /api/agent-workflows/{id}/approve`, which requires the ProcurementManager/BusinessOwner role and the same approval-limit policy as `/decision`. |
| Audit trail | State (objective, plan steps with timestamps, every tool call with input/output/attempts/duration, validation results, errors, final record) is checkpointed to `AgentWorkflowAudits` after every node. If the first checkpoint fails, nothing runs. If a checkpoint fails before `CreateProposal`, no proposal is created. |
| Safe failure | Invalid input, failed checks and tool failures come back as typed results (`InvalidInput` / `ChecksFailed` / `Failed`, HTTP 422/422/503) and are recorded. Unexpected exception messages are replaced by their type name, so connection strings can't leak into the trace. |
| Prompt injection | Free text (quotation notes, product/supplier names from other modules) never reaches a tool argument or a branch decision. `UntrustedContentScreen` flags instruction-like text, records it in the trace, withholds it from the justification and the LLM prompt, and tells the reviewer it was ignored. Input enums (`triggerType`, `sourceAgent`) and `additionalProperties: false` stop fields like `"status": "Approved"` being passed in. |

## Consequences

### Positive
- Deterministic and unit-testable end to end. `ProcurementCoordinatorAgentTests` runs the real
  services, tools, gateway and schemas over in-memory repositories.
- The approval gate is enforced in three places (tool code, output schema, controller role), not
  by an instruction to a model.
- The contract files in `agentic-ai/contracts` are what the backend actually enforces.

### Negative / trade-offs
- Less "agentic" than an LLM planner: the plan is fixed code. This is deliberate for a workflow
  that commits company money. Adaptive behaviour belongs in the upstream agents that produce
  the signal.
- The regex screen is a tripwire for the audit trail, not the main defence. It will miss some
  phrasings and may flag unusual but benign notes. The real protection is that free text has no
  path to an action.
- The trace (`AgentWorkflowAudits`, Sales DbContext) and the proposal (`ProcurementDbContext`) are
  in different contexts, so they can't commit in one transaction. If the final checkpoint fails
  after a proposal is created, the proposal exists and the error is logged with both ids.
  `GET /api/agent-workflows/{id}` always reads the proposal's live status.
- The budget check counts committed spend only (as `ProcurementProposalService` does). Other
  proposals still awaiting approval don't reserve budget.

## Viva notes
Be able to explain and demo:
- Why the agent can't approve: walk through `CreateProposalTool` → `create-proposal.output.schema.json`
  (`const: PendingApproval`) → the approve endpoint's role and policy checks.
- The injected-note demo: quotation `33333333-3333-3333-3333-333333333335` (see
  `agentic-ai/evaluation/golden-cases.md`) still yields a PendingApproval proposal for the
  requested quantity, with `UntrustedContentScreening` failed in the trace.
- Why `CreateProposal` has zero retries while reads have two.
- What the LLM is and isn't allowed to do, and the numeric-grounding check.
