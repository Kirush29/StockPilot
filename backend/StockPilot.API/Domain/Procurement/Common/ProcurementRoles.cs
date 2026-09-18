namespace StockPilot.Procurement.Domain.Common;

/// <summary>
/// Role names recognized by the procurement module. Roles themselves are issued by the
/// shared Identity module; these constants only need to match its claim values.
/// </summary>
public static class ProcurementRoles
{
    public const string BusinessOwner = "BusinessOwner";
    public const string ProcurementManager = "ProcurementManager";
    public const string BranchManager = "BranchManager";
    public const string StoreEmployee = "StoreEmployee";

    /// <summary>Roles allowed to raise proposals and view procurement data.</summary>
    public const string RaiseOrView = $"{BranchManager},{ProcurementManager},{BusinessOwner}";

    /// <summary>Roles allowed to decide on proposals, manage purchase orders and budgets.</summary>
    public const string ManageProcurement = $"{ProcurementManager},{BusinessOwner}";
}
