namespace StockPilot.Procurement.Application.Exceptions;

public class ProcurementNotFoundException(string entityName, object key)
    : Exception($"{entityName} '{key}' was not found.");
