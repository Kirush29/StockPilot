using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;

namespace StockPilot.Procurement.Tests.Api;

/// <summary>
/// Role enforcement and input validation on the proposal decision/convert endpoints and the
/// agent-workflow approve endpoint, exercised over HTTP against the real middleware pipeline.
/// Seed data: branch 1111…, supplier 2222…, budget 500,000 allocated / 6,000 spent.
/// </summary>
public class ProcurementEndpointAuthTests(ProcurementApiFactory factory) : IClassFixture<ProcurementApiFactory>
{
    private const int Approved = 0;
    private const int Rejected = 1;

    private async Task<Guid> CreatePendingProposal(decimal unitPrice, int quantity = 1)
    {
        var response = await factory.ClientAs(ProcurementRoles.BranchManager).PostAsJsonAsync("/api/procurement/proposals", new
        {
            branchId = SeedIds.Branch,
            supplierId = SeedIds.Supplier,
            quotationId = (Guid?)null,
            justification = "test",
            createdByAgent = false,
            lineItems = new[] { new { productId = SeedIds.ProductChair, quantity, unitPrice } },
            submitForApproval = true
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.ReadJsonAsync()).GetProperty("id").GetGuid();
    }

    private Task<HttpResponseMessage> Decide(string? role, Guid proposalId, int decision, string? comment = null) =>
        factory.ClientAs(role).PostAsJsonAsync($"/api/procurement/proposals/{proposalId}/decision", new { decision, comment });

    private Task<HttpResponseMessage> Convert(string? role, Guid proposalId) =>
        factory.ClientAs(role).PostAsync($"/api/procurement/proposals/{proposalId}/convert", null);

    // ── Decision endpoint ────────────────────────────────────────────────────

    [Fact]
    public async Task Decision_WithoutToken_Is401()
    {
        var id = await CreatePendingProposal(100m);

        (await Decide(null, id, Approved)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData(ProcurementRoles.BranchManager)]
    [InlineData(ProcurementRoles.StoreEmployee)]
    public async Task Decision_ByNonManagerRole_Is403(string role)
    {
        var id = await CreatePendingProposal(100m);

        (await Decide(role, id, Approved)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await Decide(role, id, Rejected, "no")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Decision_ProcurementManagerWithinLimit_Approves()
    {
        var id = await CreatePendingProposal(50_000m);

        var response = await Decide(ProcurementRoles.ProcurementManager, id, Approved);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.ReadJsonAsync()).GetProperty("status").GetInt32().Should().Be(2, "2 = Approved");
    }

    [Fact]
    public async Task Decision_ProcurementManagerOverLimit_Is403_AndProposalStaysPending()
    {
        var id = await CreatePendingProposal(50_000.01m);

        (await Decide(ProcurementRoles.ProcurementManager, id, Approved)).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var proposal = await (await factory.ClientAs(ProcurementRoles.BusinessOwner).GetAsync($"/api/procurement/proposals/{id}")).ReadJsonAsync();
        proposal.GetProperty("status").GetInt32().Should().Be(1, "1 = PendingApproval");
    }

    [Fact]
    public async Task Decision_BusinessOwnerOverManagerLimit_Approves()
    {
        var id = await CreatePendingProposal(120_000m);

        (await Decide(ProcurementRoles.BusinessOwner, id, Approved)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Decision_RejectWithoutComment_Is400()
    {
        var id = await CreatePendingProposal(100m);

        var response = await Decide(ProcurementRoles.ProcurementManager, id, Rejected);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.ReadJsonAsync()).GetProperty("errors").TryGetProperty("Comment", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Decision_Twice_Is409()
    {
        var id = await CreatePendingProposal(100m);
        await Decide(ProcurementRoles.ProcurementManager, id, Approved);

        (await Decide(ProcurementRoles.ProcurementManager, id, Approved)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Decision_UnknownProposal_Is404()
    {
        (await Decide(ProcurementRoles.ProcurementManager, Guid.NewGuid(), Approved)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Convert endpoint ─────────────────────────────────────────────────────

    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData(ProcurementRoles.StoreEmployee, HttpStatusCode.Forbidden)]
    [InlineData(ProcurementRoles.BranchManager, HttpStatusCode.Forbidden)]
    public async Task Convert_ByUnauthorizedCaller_IsRejected(string? role, HttpStatusCode expected)
    {
        var id = await CreatePendingProposal(100m);
        await Decide(ProcurementRoles.ProcurementManager, id, Approved);

        (await Convert(role, id)).StatusCode.Should().Be(expected);
    }

    [Fact]
    public async Task Convert_PendingProposal_Is409()
    {
        var id = await CreatePendingProposal(100m);

        (await Convert(ProcurementRoles.ProcurementManager, id)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Convert_ApprovedProposal_CreatesOrder_AndCommitsBudget()
    {
        var owner = factory.ClientAs(ProcurementRoles.BusinessOwner);
        var before = (await (await owner.GetAsync($"/api/procurement/budgets?branchId={SeedIds.Branch}")).ReadJsonAsync())[0]
            .GetProperty("spentAmount").GetDecimal();
        var id = await CreatePendingProposal(1_234.56m, quantity: 2);
        await Decide(ProcurementRoles.ProcurementManager, id, Approved);

        var response = await Convert(ProcurementRoles.ProcurementManager, id);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location!.ToString().Should().Contain("/api/procurement/orders/");
        var order = await response.ReadJsonAsync();
        order.GetProperty("totalCost").GetDecimal().Should().Be(2_469.12m);
        var after = (await (await owner.GetAsync($"/api/procurement/budgets?branchId={SeedIds.Branch}")).ReadJsonAsync())[0]
            .GetProperty("spentAmount").GetDecimal();
        after.Should().Be(before + 2_469.12m);
        (await Convert(ProcurementRoles.ProcurementManager, id)).StatusCode.Should().Be(HttpStatusCode.Conflict, "a proposal converts once");
    }

    // ── Input validation on create ───────────────────────────────────────────

    [Fact]
    public async Task Create_NegativeQuantity_Is400_WithFieldError()
    {
        var response = await factory.ClientAs(ProcurementRoles.BranchManager).PostAsJsonAsync("/api/procurement/proposals", new
        {
            branchId = SeedIds.Branch,
            supplierId = SeedIds.Supplier,
            createdByAgent = false,
            lineItems = new[] { new { productId = SeedIds.ProductChair, quantity = -3, unitPrice = 10m } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.ReadJsonAsync()).GetProperty("errors").TryGetProperty("LineItems[0].Quantity", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Create_BlockedSupplier_Is400()
    {
        var response = await factory.ClientAs(ProcurementRoles.BranchManager).PostAsJsonAsync("/api/procurement/proposals", new
        {
            branchId = SeedIds.Branch,
            supplierId = SeedIds.SupplierBlocked,
            createdByAgent = false,
            lineItems = new[] { new { productId = SeedIds.ProductChair, quantity = 1, unitPrice = 10m } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.ReadJsonAsync()).GetProperty("detail").GetString().Should().Contain("blocked");
    }

    [Fact]
    public async Task Create_OverBudget_Is422()
    {
        var response = await factory.ClientAs(ProcurementRoles.BranchManager).PostAsJsonAsync("/api/procurement/proposals", new
        {
            branchId = SeedIds.Branch,
            supplierId = SeedIds.Supplier,
            createdByAgent = false,
            lineItems = new[] { new { productId = SeedIds.ProductChair, quantity = 1000, unitPrice = 1_000m } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await response.ReadJsonAsync()).GetProperty("title").GetString().Should().Be("Budget exceeded");
    }

    [Fact]
    public async Task Create_ByStoreEmployee_Is403()
    {
        var response = await factory.ClientAs(ProcurementRoles.StoreEmployee).PostAsJsonAsync("/api/procurement/proposals", new
        {
            branchId = SeedIds.Branch, supplierId = SeedIds.Supplier, createdByAgent = false,
            lineItems = new[] { new { productId = SeedIds.ProductChair, quantity = 1, unitPrice = 1m } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Agent workflow approve endpoint ──────────────────────────────────────

    private async Task<Guid> StartTonerWorkflow(int quantity)
    {
        var response = await factory.ClientAs(ProcurementRoles.BranchManager).PostAsJsonAsync("/api/agent-workflows/procurement/start", new
        {
            triggerType = "LowStock",
            productId = SeedIds.ProductToner,
            branchId = SeedIds.Branch,
            suggestedQuantity = quantity,
            candidateSupplierId = SeedIds.Supplier,
            quotationId = SeedIds.QuotationToner,
            sourceAgent = "InventoryOptimizationAgent"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.ReadJsonAsync()).GetProperty("workflowId").GetGuid();
    }

    [Fact]
    public async Task AgentApprove_EnforcesRoleAndLimit_ThenDelegatesToDecision()
    {
        // 7 × 7,500 = 52,500: above the ProcurementManager limit of 50,000.
        var workflowId = await StartTonerWorkflow(7);
        var approve = (string? role) => factory.ClientAs(role).PostAsJsonAsync($"/api/agent-workflows/{workflowId}/approve", new { comment = "ok" });

        (await approve(null)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await approve(ProcurementRoles.BranchManager)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await approve(ProcurementRoles.ProcurementManager)).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var ok = await approve(ProcurementRoles.BusinessOwner);
        ok.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ok.ReadJsonAsync()).GetProperty("status").GetInt32().Should().Be(2);
        (await approve(ProcurementRoles.BusinessOwner)).StatusCode.Should().Be(HttpStatusCode.Conflict);

        var trace = await (await factory.ClientAs(ProcurementRoles.BranchManager).GetAsync($"/api/agent-workflows/{workflowId}")).ReadJsonAsync();
        trace.GetProperty("approvalStatus").GetString().Should().Be("Approved");
        trace.GetProperty("proposalStatus").GetString().Should().Be("Approved");
    }

    [Fact]
    public async Task AgentStart_ByStoreEmployee_Is403()
    {
        var response = await factory.ClientAs(ProcurementRoles.StoreEmployee).PostAsync(
            "/api/agent-workflows/procurement/start", JsonContent.Create(new { }));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AgentApprove_UnknownWorkflow_Is404()
    {
        var response = await factory.ClientAs(ProcurementRoles.BusinessOwner)
            .PostAsJsonAsync($"/api/agent-workflows/{Guid.NewGuid()}/approve", new { comment = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
