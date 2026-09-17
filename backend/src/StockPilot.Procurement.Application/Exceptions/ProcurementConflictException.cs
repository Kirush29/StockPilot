namespace StockPilot.Procurement.Application.Exceptions;

/// <summary>Thrown when a request conflicts with the current state of the resource (e.g. double conversion).</summary>
public class ProcurementConflictException(string message) : Exception(message);
