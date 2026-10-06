using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StockPilot.Application.AgenticAI.Contracts;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Application.Sales.DTOs;
using StockPilot.Application.Sales.Interfaces;
using StockPilot.Domain.Entities.Agentic;
using StockPilot.Domain.Entities.Sales;
using StockPilot.Domain.Enums.Sales;

namespace StockPilot.Application.AgenticAI.DemandForecastAgent;

public class DemandForecastAgent : IDemandForecastAgent
{
    private readonly IApplicationDbContext _context;
    private readonly IDemandForecastService _forecastService;

    // Prompt injection patterns to detect and safely neutralize
    private static readonly Regex InjectionPattern = new(
        @"(ignore\s+(previous|prior)\s+instructions|system\s+prompt|drop\s+table|delete\s+from|bypass\s+validation|set\s+reorder\s+to\s+0|<script|javascript:)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public DemandForecastAgent(IApplicationDbContext context, IDemandForecastService forecastService)
    {
        _context = context;
        _forecastService = forecastService;
    }

    public async Task<AgentExecutionResultDto> ExecuteForecastWorkflowAsync(
        DemandForecastWorkflowRequestDto request, 
        CancellationToken cancellationToken = default)
    {
        var totalStopwatch = Stopwatch.StartNew();
        var workflowId = Guid.NewGuid();

        var state = new WorkflowStateDto
        {
            WorkflowId = workflowId,
            Objective = $"Generate {request.ForecastDays}-day demand forecast and ROP for {request.ProductName} ({request.ProductSku})",
            InitiatedBy = string.IsNullOrWhiteSpace(request.InitiatedBy) ? "SalesManager" : request.InitiatedBy,
            CurrentStep = "PlanInitialization",
            Plan = new List<WorkflowPlanStepDto>
            {
                new() { StepIndex = 1, Action = "FetchHistoricalSales", Status = "Pending" },
                new() { StepIndex = 2, Action = "ComputeStatisticalBaseline", Status = "Pending" },
                new() { StepIndex = 3, Action = "EvaluateMarketFactors", Status = "Pending" },
                new() { StepIndex = 4, Action = "SynthesizeForecastAndBounds", Status = "Pending" }
            },
            ToolExecutions = new List<ToolExecutionDto>(),
            ValidationResults = new List<ValidationResultDto>(),
            Errors = new List<string>(),
            RetryCount = 0,
            ApprovalStatus = "NotRequired" // Forecasts inform proposals; human approval is on purchase order creation
        };

        try
        {
            // -------------------------------------------------------------
            // Step 1: Tool - FetchSalesHistoryTool
            // -------------------------------------------------------------
            state.CurrentStep = "FetchSalesHistory";
            state.Plan[0].Status = "Running";
            var step1Sw = Stopwatch.StartNew();

            var cutoff = DateTime.UtcNow.AddDays(-60);
            var salesHistory = await _context.SaleItems
                .Include(si => si.Sale)
                .AsNoTracking()
                .Where(si => si.ProductId == request.ProductId && si.Sale.SaleDateUtc >= cutoff)
                .ToListAsync(cancellationToken);

            step1Sw.Stop();
            state.Plan[0].Status = "Completed";

            var dailyBuckets = salesHistory
                .GroupBy(si => si.Sale.SaleDateUtc.Date)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            state.ToolExecutions.Add(new ToolExecutionDto
            {
                ToolName = "FetchSalesHistoryTool",
                InputParameters = new { productId = request.ProductId, lookbackDays = 60 },
                OutputPayload = new { recordsRetrieved = salesHistory.Count, uniqueTradingDays = dailyBuckets.Count, totalUnitsSold = dailyBuckets.Values.Sum() },
                ExecutedAtUtc = DateTime.UtcNow,
                DurationMs = (int)step1Sw.ElapsedMilliseconds,
                IsSuccess = true
            });

            // -------------------------------------------------------------
            // Step 2: Tool - ComputeStatisticalBaselineTool
            // -------------------------------------------------------------
            state.CurrentStep = "ComputeStatisticalBaseline";
            state.Plan[1].Status = "Running";
            var step2Sw = Stopwatch.StartNew();

            var totalDays = 60;
            var totalQty = dailyBuckets.Values.Sum();
            decimal ads = dailyBuckets.Count > 0 ? (totalQty / (decimal)totalDays) : 6.0m;
            if (ads < 1.0m) ads = 2.0m; // minimum stability baseline

            double stdDev = 0;
            if (dailyBuckets.Count > 1)
            {
                var mean = (double)ads;
                var variance = dailyBuckets.Values.Average(v => Math.Pow((double)v - mean, 2));
                stdDev = Math.Sqrt(variance);
            }
            else
            {
                stdDev = (double)(ads * 0.25m);
            }

            var leadTime = request.LeadTimeDays > 0 ? request.LeadTimeDays : 7;
            var zScore = 1.65m; // 95% service level
            var safetyStock = Math.Round(zScore * (decimal)stdDev * (decimal)Math.Sqrt(leadTime), 0);
            var reorderPoint = Math.Round((leadTime * ads) + safetyStock, 0);

            step2Sw.Stop();
            state.Plan[1].Status = "Completed";

            state.ToolExecutions.Add(new ToolExecutionDto
            {
                ToolName = "ComputeStatisticalBaselineTool",
                InputParameters = new { averageDailySales = ads, standardDeviation = stdDev, leadTimeDays = leadTime, serviceLevel = "95%" },
                OutputPayload = new { safetyStock, reorderPoint, baselineConfidence = dailyBuckets.Count >= 20 ? 0.94 : 0.82 },
                ExecutedAtUtc = DateTime.UtcNow,
                DurationMs = (int)step2Sw.ElapsedMilliseconds,
                IsSuccess = true
            });

            // -------------------------------------------------------------
            // Step 3: Tool - EvaluateMarketFactorsTool (with injection defense)
            // -------------------------------------------------------------
            state.CurrentStep = "EvaluateMarketFactors";
            state.Plan[2].Status = "Running";
            var step3Sw = Stopwatch.StartNew();

            decimal appliedUpliftPercent = 0.0m;
            var promptInjectionDetected = false;

            if (!string.IsNullOrWhiteSpace(request.MarketContextNotes))
            {
                if (InjectionPattern.IsMatch(request.MarketContextNotes))
                {
                    promptInjectionDetected = true;
                    state.ValidationResults.Add(new ValidationResultDto
                    {
                        Rule = "PromptInjectionDefense",
                        Passed = false,
                        Details = "Suspicious prompt-injection instructions detected in market notes. Input was safely sanitized and ignored."
                    });
                }
                else
                {
                    state.ValidationResults.Add(new ValidationResultDto
                    {
                        Rule = "PromptInjectionDefense",
                        Passed = true,
                        Details = "Market notes passed sanitization checks."
                    });

                    if (request.ExpectedUpliftPercent.HasValue)
                    {
                        // Constrain uplift between -50% and +150% to prevent hallucinated extremes
                        appliedUpliftPercent = Math.Clamp(request.ExpectedUpliftPercent.Value, -50.0m, 150.0m);
                    }
                }
            }

            step3Sw.Stop();
            state.Plan[2].Status = "Completed";

            state.ToolExecutions.Add(new ToolExecutionDto
            {
                ToolName = "EvaluateMarketFactorsTool",
                InputParameters = new { rawNotes = request.MarketContextNotes, requestedUplift = request.ExpectedUpliftPercent },
                OutputPayload = new { promptInjectionDetected, finalUpliftPercent = appliedUpliftPercent },
                ExecutedAtUtc = DateTime.UtcNow,
                DurationMs = (int)step3Sw.ElapsedMilliseconds,
                IsSuccess = true
            });

            // -------------------------------------------------------------
            // Step 4: Tool - SynthesizeForecastAndBoundsTool
            // -------------------------------------------------------------
            state.CurrentStep = "SynthesizeForecastAndBounds";
            state.Plan[3].Status = "Running";
            var step4Sw = Stopwatch.StartNew();

            var adjustedAds = ads * (1.0m + (appliedUpliftPercent / 100.0m));
            var periodDays = request.ForecastDays > 0 ? request.ForecastDays : 30;
            var predictedTotal = Math.Round(adjustedAds * periodDays, 0);

            // Suggested reorder date estimation
            DateTime? suggestedReorderDate = null;
            if (request.CurrentStockLevel > 0 && adjustedAds > 0)
            {
                var daysOfSupply = (int)(request.CurrentStockLevel / adjustedAds);
                suggestedReorderDate = DateTime.UtcNow.AddDays(Math.Max(1, daysOfSupply - leadTime));
            }
            else
            {
                suggestedReorderDate = DateTime.UtcNow.AddDays(1);
            }

            // Trend
            var trend = appliedUpliftPercent > 10 ? DemandTrend.Increasing
                      : appliedUpliftPercent < -10 ? DemandTrend.Decreasing
                      : DemandTrend.Stable;

            var confidence = dailyBuckets.Count >= 30 ? 0.95 : dailyBuckets.Count >= 10 ? 0.88 : 0.80;
            if (promptInjectionDetected) confidence = 0.75; // Penalize confidence if hostile input encountered

            var reasoning = $"Demand Forecast Agent synthesized {periodDays}-day trajectory. " +
                            $"Historical daily velocity: {ads:F1} units (σ={stdDev:F1}). " +
                            (appliedUpliftPercent != 0 ? $"Applied market adjustment of {appliedUpliftPercent:+0.0;-0.0}%. " : "") +
                            $"Calculated Safety Stock = {safetyStock} units, Reorder Point (ROP) = {reorderPoint} units with {confidence:P0} confidence.";

            // Construct Domain Entity & Save
            var forecastEntity = new DemandForecast
            {
                ProductId = request.ProductId,
                ProductSku = request.ProductSku,
                ProductName = request.ProductName,
                BranchId = request.BranchId,
                BranchName = request.BranchName,
                Period = (ForecastPeriod)periodDays,
                GeneratedAtUtc = DateTime.UtcNow,
                ConfidenceScore = confidence,
                PredictedTotalDemand = predictedTotal,
                AverageDailyDemand = Math.Round(adjustedAds, 2),
                SuggestedReorderDateUtc = suggestedReorderDate,
                RecommendedSafetyStock = safetyStock,
                RecommendedReorderQuantity = Math.Round(predictedTotal * 1.15m, 0),
                Trend = trend,
                AgentReasoning = reasoning,
                AgentExecutionId = workflowId
            };

            var random = new Random(42); // Deterministic seed for reproducible baseline bounds
            for (int i = 1; i <= periodDays; i++)
            {
                var targetDate = DateTime.UtcNow.Date.AddDays(i);
                var dayVariance = (decimal)(random.NextDouble() * 0.16 - 0.08);
                var dayPredicted = Math.Max(0, Math.Round(adjustedAds * (1 + dayVariance), 1));
                var dayBound = (decimal)(stdDev * 1.65);

                forecastEntity.Items.Add(new DemandForecastItem
                {
                    ForecastDateUtc = targetDate,
                    PredictedQuantity = dayPredicted,
                    LowerBoundQuantity = Math.Max(0, Math.Round(dayPredicted - dayBound, 1)),
                    UpperBoundQuantity = Math.Round(dayPredicted + dayBound, 1)
                });
            }

            _context.DemandForecasts.Add(forecastEntity);
            await _context.SaveChangesAsync(cancellationToken);

            step4Sw.Stop();
            state.Plan[3].Status = "Completed";

            state.ToolExecutions.Add(new ToolExecutionDto
            {
                ToolName = "SynthesizeForecastAndBoundsTool",
                InputParameters = new { adjustedAds, forecastDays = periodDays },
                OutputPayload = new { predictedTotalDemand = predictedTotal, dailyForecastPointsGenerated = forecastEntity.Items.Count },
                ExecutedAtUtc = DateTime.UtcNow,
                DurationMs = (int)step4Sw.ElapsedMilliseconds,
                IsSuccess = true
            });

            // -------------------------------------------------------------
            // Post-execution Validation Checks
            // -------------------------------------------------------------
            state.ValidationResults.Add(new ValidationResultDto
            {
                Rule = "NonNegativeDemandConstraint",
                Passed = predictedTotal >= 0 && forecastEntity.Items.All(x => x.PredictedQuantity >= 0),
                Details = "All projected daily quantities and total demand are non-negative."
            });

            state.ValidationResults.Add(new ValidationResultDto
            {
                Rule = "ReorderPointSanity",
                Passed = reorderPoint >= (leadTime * ads),
                Details = $"ROP ({reorderPoint}) is strictly greater than or equal to lead time demand ({leadTime * ads:F1})."
            });

            state.CurrentStep = "Completed";
            totalStopwatch.Stop();

            state.FinalOutcome = new
            {
                forecastId = forecastEntity.Id,
                productId = forecastEntity.ProductId,
                predictedTotalDemand = predictedTotal,
                averageDailyDemand = adjustedAds,
                reorderPoint = reorderPoint,
                safetyStock = safetyStock,
                confidenceScore = confidence,
                trend = trend.ToString(),
                reasoning
            };

            // Save Audit to Database
            var auditEntity = new AgentWorkflowAudit
            {
                Id = workflowId,
                AgentName = "DemandForecastAgent",
                Objective = state.Objective,
                InitiatedBy = state.InitiatedBy,
                CurrentStep = state.CurrentStep,
                PlanJson = JsonSerializer.Serialize(state.Plan),
                ToolExecutionsJson = JsonSerializer.Serialize(state.ToolExecutions),
                ValidationResultsJson = JsonSerializer.Serialize(state.ValidationResults),
                ErrorsJson = JsonSerializer.Serialize(state.Errors),
                FinalOutcomeJson = JsonSerializer.Serialize(state.FinalOutcome),
                ExecutionDurationMs = totalStopwatch.ElapsedMilliseconds,
                IsSuccess = true,
                ApprovalStatus = "NotRequired"
            };

            _context.AgentWorkflowAudits.Add(auditEntity);
            await _context.SaveChangesAsync(cancellationToken);

            var forecastDto = new DemandForecastDto
            {
                Id = forecastEntity.Id,
                ProductId = forecastEntity.ProductId,
                ProductSku = forecastEntity.ProductSku,
                ProductName = forecastEntity.ProductName,
                BranchId = forecastEntity.BranchId,
                BranchName = forecastEntity.BranchName,
                Period = forecastEntity.Period,
                GeneratedAtUtc = forecastEntity.GeneratedAtUtc,
                ConfidenceScore = forecastEntity.ConfidenceScore,
                PredictedTotalDemand = forecastEntity.PredictedTotalDemand,
                AverageDailyDemand = forecastEntity.AverageDailyDemand,
                SuggestedReorderDateUtc = forecastEntity.SuggestedReorderDateUtc,
                RecommendedSafetyStock = forecastEntity.RecommendedSafetyStock,
                RecommendedReorderQuantity = forecastEntity.RecommendedReorderQuantity,
                Trend = forecastEntity.Trend,
                AgentReasoning = forecastEntity.AgentReasoning,
                AgentExecutionId = workflowId,
                Items = forecastEntity.Items.Select(i => new DemandForecastItemDto
                {
                    ForecastDateUtc = i.ForecastDateUtc,
                    PredictedQuantity = i.PredictedQuantity,
                    LowerBoundQuantity = i.LowerBoundQuantity,
                    UpperBoundQuantity = i.UpperBoundQuantity
                }).OrderBy(x => x.ForecastDateUtc).ToList()
            };

            return new AgentExecutionResultDto
            {
                IsSuccess = true,
                Forecast = forecastDto,
                WorkflowState = state,
                SummaryMessage = $"Demand Forecast Agent successfully planned and executed 4 tools in {totalStopwatch.ElapsedMilliseconds}ms."
            };
        }
        catch (Exception ex)
        {
            totalStopwatch.Stop();
            state.CurrentStep = "Failed";
            state.Errors.Add(ex.Message);

            var failedAudit = new AgentWorkflowAudit
            {
                Id = workflowId,
                AgentName = "DemandForecastAgent",
                Objective = state.Objective,
                InitiatedBy = state.InitiatedBy,
                CurrentStep = "Failed",
                PlanJson = JsonSerializer.Serialize(state.Plan),
                ToolExecutionsJson = JsonSerializer.Serialize(state.ToolExecutions),
                ValidationResultsJson = JsonSerializer.Serialize(state.ValidationResults),
                ErrorsJson = JsonSerializer.Serialize(state.Errors),
                ExecutionDurationMs = totalStopwatch.ElapsedMilliseconds,
                IsSuccess = false
            };

            _context.AgentWorkflowAudits.Add(failedAudit);
            await _context.SaveChangesAsync(cancellationToken);

            return new AgentExecutionResultDto
            {
                IsSuccess = false,
                WorkflowState = state,
                SummaryMessage = $"Agent workflow execution failed: {ex.Message}"
            };
        }
    }

    public async Task<List<WorkflowStateDto>> GetWorkflowAuditHistoryAsync(int take = 20, CancellationToken cancellationToken = default)
    {
        var audits = await _context.AgentWorkflowAudits
            .AsNoTracking()
            .Where(a => a.AgentName == "DemandForecastAgent")
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);

        return audits.Select(MapAuditToStateDto).ToList();
    }

    public async Task<WorkflowStateDto?> GetWorkflowAuditByIdAsync(Guid workflowId, CancellationToken cancellationToken = default)
    {
        var audit = await _context.AgentWorkflowAudits
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == workflowId, cancellationToken);

        return audit != null ? MapAuditToStateDto(audit) : null;
    }

    private static WorkflowStateDto MapAuditToStateDto(AgentWorkflowAudit audit)
    {
        return new WorkflowStateDto
        {
            WorkflowId = audit.Id,
            Objective = audit.Objective,
            InitiatedBy = audit.InitiatedBy,
            CurrentStep = audit.CurrentStep,
            Plan = JsonSerializer.Deserialize<List<WorkflowPlanStepDto>>(audit.PlanJson) ?? new(),
            ToolExecutions = JsonSerializer.Deserialize<List<ToolExecutionDto>>(audit.ToolExecutionsJson) ?? new(),
            ValidationResults = JsonSerializer.Deserialize<List<ValidationResultDto>>(audit.ValidationResultsJson) ?? new(),
            Errors = JsonSerializer.Deserialize<List<string>>(audit.ErrorsJson) ?? new(),
            RetryCount = audit.RetryCount,
            ApprovalStatus = audit.ApprovalStatus,
            FinalOutcome = !string.IsNullOrEmpty(audit.FinalOutcomeJson)
                ? JsonSerializer.Deserialize<object>(audit.FinalOutcomeJson)
                : null
        };
    }
}
