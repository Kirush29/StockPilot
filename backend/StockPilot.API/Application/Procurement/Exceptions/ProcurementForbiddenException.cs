namespace StockPilot.Procurement.Application.Exceptions;

/// <summary>Thrown when the caller is authenticated but not permitted to perform this specific action.</summary>
public class ProcurementForbiddenException(string message) : Exception(message);
