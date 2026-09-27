namespace StockPilot.Procurement.Infrastructure.Persistence.Seed;

/// <summary>
/// Fixed GUIDs used by both the EF Core seed data and the in-memory external-module stubs, so a
/// freshly migrated database and the stub Products/Suppliers/Branches services agree with each
/// other and the demo has consistent data on first run.
/// </summary>
public static class SeedIds
{
    public static readonly Guid Branch = new("11111111-1111-1111-1111-111111111111");

    public static readonly Guid Supplier = new("22222222-2222-2222-2222-222222222222");

    public static readonly Guid Quotation = new("33333333-3333-3333-3333-333333333333");

    public static readonly Guid ProductPaper = new("44444444-4444-4444-4444-444444444441");
    public static readonly Guid ProductInk = new("44444444-4444-4444-4444-444444444442");
    public static readonly Guid ProductChair = new("44444444-4444-4444-4444-444444444443");

    // Stub-only (no database rows): demo data for the Procurement Coordinator Agent. The toner has
    // no open proposal, so a run for it can reach PendingApproval; the stapler quotation carries a
    // prompt-injection note.
    public static readonly Guid ProductToner = new("44444444-4444-4444-4444-444444444444");
    public static readonly Guid ProductStapler = new("44444444-4444-4444-4444-444444444445");
    public static readonly Guid QuotationToner = new("33333333-3333-3333-3333-333333333334");
    public static readonly Guid QuotationStaplerWithInjectedNote = new("33333333-3333-3333-3333-333333333335");
    public static readonly Guid SupplierBlocked = new("22222222-2222-2222-2222-222222222223");

    public static readonly Guid UserBranchManager = new("55555555-5555-5555-5555-555555555551");
    public static readonly Guid UserProcurementManager = new("55555555-5555-5555-5555-555555555552");
    public static readonly Guid UserBusinessOwner = new("55555555-5555-5555-5555-555555555553");

    public static readonly Guid Budget = new("66666666-6666-6666-6666-666666666661");

    public static readonly Guid ProposalDraft = new("77777777-7777-7777-7777-777777777771");
    public static readonly Guid ProposalPendingApproval = new("77777777-7777-7777-7777-777777777772");
    public static readonly Guid ProposalConverted = new("77777777-7777-7777-7777-777777777773");

    public static readonly Guid ApprovalDecisionForConverted = new("88888888-8888-8888-8888-888888888881");

    public static readonly Guid PurchaseOrder = new("99999999-9999-9999-9999-999999999991");

    public static readonly DateTimeOffset SeedTimestamp = new(2026, 1, 15, 9, 0, 0, TimeSpan.Zero);
}
