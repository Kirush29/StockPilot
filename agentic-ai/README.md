# agentic-ai

Agent contracts, evaluation material, and the one agent that is implemented in Python.

```
agentic-ai/
  agents/
    supplier_evaluation/   Supplier Evaluation Agent (Student 3), Python — run by the API as a subprocess
  contracts/               JSON contracts for every agent and the orchestrator (the API validates hand-offs against them)
  evaluation/              golden cases (Procurement Coordinator, Replenishment Orchestrator)
  tests/                   tests for the Python agent (pytest)
```

## Where each agent lives

Only the Supplier Evaluation Agent is a Python service; the other three agents and the orchestrator run
in process in the ASP.NET Core API, so they are not duplicated here:

| Agent | Implementation |
| --- | --- |
| Inventory Optimization (Student 1) | `backend/StockPilot.Api/Modules/Inventory/Infrastructure/Services/InventoryOptimizationService.cs` |
| Demand Forecast (Student 2) | `backend/StockPilot.Api/Modules/SalesDemand/Agents/DemandForecastAgent/` |
| Supplier Evaluation (Student 3) | `agentic-ai/agents/supplier_evaluation/` (called through `Modules/Suppliers/Infrastructure/Services/AgenticAiIntegrationService.cs`) |
| Procurement Coordinator (Student 4) | `backend/StockPilot.Api/Modules/Procurement/Agents/ProcurementCoordinator/` |
| **Replenishment Orchestrator** (routes between the four) | `backend/StockPilot.Api/Shared/Agents/Orchestrator/` — contracts in `contracts/replenishment-orchestrator/` |

## Supplier Evaluation Agent

```bash
pip install -r requirements.txt          # openai, python-dotenv

# Set your Gemini API key in agentic-ai/.env:
# GEMINI_API_KEY=AIzaSy...

# Run in deterministic mode:
echo '{"mode":"deterministic","productId":"...","candidates":[...]}' | python -m agents.supplier_evaluation

# Run in AI mode (uses Gemini / OpenAI):
echo '{"mode":"ai","productId":"...","candidates":[...]}' | python -m agents.supplier_evaluation

python -m pytest -q                      # runs all pytest tests
```

The API runs it with `AgenticAi:EntryPoint = -m agents.supplier_evaluation` from this folder
(`backend/StockPilot.Api/appsettings.json`). Input and output shapes: `contracts/supplier-evaluation-*.schema.json`.

