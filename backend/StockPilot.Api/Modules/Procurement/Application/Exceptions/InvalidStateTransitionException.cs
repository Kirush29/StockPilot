namespace StockPilot.Procurement.Application.Exceptions;

public class InvalidStateTransitionException(string entityName, string from, string to)
    : Exception($"{entityName} cannot transition from '{from}' to '{to}'.");
