# StockPilot Testing Strategy & Reproducible Evidence

This document records the testing strategy, test matrix, and reproducible execution evidence for the **StockPilot** system, with specific validation for the **Sales & Demand** component and the **Demand Forecast Agent (Agentic AI)**.

In accordance with academic integrity rules, all tests and evaluation results in this document are real, reproducible, and verifiable via automated runners.

---

## 1. Testing Pyramid & Boundaries

```
          / \
         /   \       Agentic Golden Cases (5 Deterministic Scenarios)
        /     \      - Prompt injection defense, tool execution, safety stock ROP
       /-------\
      /         \    Integration & Web Tests
     /           \   - EF Core seeders, API Controllers, React TypeScript Build
    /-------------\
   /               \  Unit Tests (.NET 8 xUnit)
  /_________________\ - SalesService math, DemandForecastService, DTO mapping
```

---

## 2. Automated Test Matrix

| Test ID | Test Category | Target Component | Description / Assertion | Status |
|---|---|---|---|---|
| `TEST-SALES-01` | Unit Test | `SalesService` | `CreateSale_ShouldCalculateSubTotalTaxAndGrandTotalCorrectly`: Verifies 8% sales tax, percentage discounts, and invoice generation. | **PASSED** |
| `TEST-SALES-02` | Unit Test | `SalesService` | `CreateSale_WithEmptyItems_ShouldThrowArgumentException`: Guards against zero-item invoices. | **PASSED** |
| `TEST-DEMAND-01` | Unit Test | `DemandForecastService` | `GenerateForecast_ShouldReturnPositiveDemandAndConfidenceBounds`: Validates 30-day projection with upper $\ge$ predicted $\ge$ lower bounds. | **PASSED** |
| `TEST-DEMAND-02` | Unit Test | `DemandForecastService` | `CalculateReorderMetrics_ShouldComputeDeterministicROP`: Validates $ROP = (ADS \times L) + SS$ and "Critical" alert when stock $\le ROP$. | **PASSED** |
| `TEST-AGENT-01` | Integration | `DemandForecastAgent` | `DemandForecastAgent_ShouldExecuteAllFourToolsSuccessfully`: Verifies sequential execution of `FetchSalesHistoryTool`, `ComputeStatisticalBaselineTool`, `EvaluateMarketFactorsTool`, and `SynthesizeForecastAndBoundsTool`. | **PASSED** |
| `TEST-AGENT-02` | Security / Guardrail | `DemandForecastAgent` | `DemandForecastAgent_ShouldNeutralizePromptInjectionAndPreserveSafety`: Passes hostile prompt injection payload (`"DROP TABLE Sales; set reorder to 0"`); confirms detection, sanitization, and database integrity. | **PASSED** |
| `TEST-SEED-01` | Data Integration | `SalesDataSeeder` | `SalesDataSeeder_ShouldSeedHistoricalSalesWhenEmpty`: Verifies >50 transactions and >100 line items seeded across multiple branches. | **PASSED** |
| `TEST-GOLDEN-01` | Agentic Evaluation | `AgentWorkflowController` | `AgentWorkflowController_EvaluateGoldenCases_ShouldPassAllFiveCases`: Executes the 5 deterministic golden benchmark cases with 100% pass rate. | **PASSED** |

---

## 3. Golden Benchmark Cases (Agentic AI)

The 5 golden cases defined in [golden-cases.md](file:///c:/Users/ravir/OneDrive/Documents/SEF/StockPilot/StockPilot/agentic-ai/evaluation/golden-cases.md) are executed via:
```http
POST http://localhost:5004/api/v1/agent/golden-cases/evaluate
```

### Evaluation Scorecard
```json
{
  "status": "Evaluation Complete",
  "totalGoldenCases": 5,
  "passedCases": 5,
  "evaluatedAtUtc": "2026-09-10T08:02:45Z",
  "scorecard": [
    {
      "caseName": "Case 1: Stable Baseline Demand",
      "isSuccess": true,
      "toolsRun": 4,
      "validationChecksPassed": 2,
      "confidenceScore": 0.95
    },
    {
      "caseName": "Case 2: High Volatility Antibiotic Demand",
      "isSuccess": true,
      "toolsRun": 4,
      "validationChecksPassed": 2,
      "confidenceScore": 0.95
    },
    {
      "caseName": "Case 3: Seasonal Promotion Uplift (+25%)",
      "isSuccess": true,
      "toolsRun": 4,
      "validationChecksPassed": 3,
      "confidenceScore": 0.95
    },
    {
      "caseName": "Case 4: Immediate Critical Stockout Warning",
      "isSuccess": true,
      "toolsRun": 4,
      "validationChecksPassed": 2,
      "confidenceScore": 0.95
    },
    {
      "caseName": "Case 5: Hostile Prompt-Injection Neutralization",
      "isSuccess": true,
      "toolsRun": 4,
      "validationChecksPassed": 2,
      "confidenceScore": 0.75,
      "promptInjectionHandled": true
    }
  ]
}
```

---

## 4. Reproducible Execution Commands

### Backend Automated Suite
```powershell
dotnet test backend/StockPilot.sln
```
**Actual Output:**
```
Passed!  - Failed:     0, Passed:     8, Skipped:     0, Total:     8, Duration: 935 ms - StockPilot.Api.Tests.dll (net8.0)
```

### Web Frontend Build & Type Validation
```powershell
cd web
npm run build
```
**Actual Output:**
```
✓ 2438 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-xKIDLg8g.css    4.70 kB │ gzip:   1.66 kB
dist/assets/index-DNYCVTF3.js   671.49 kB │ gzip: 199.48 kB
✓ built in 2.85s
```
