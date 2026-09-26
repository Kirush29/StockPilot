namespace StockPilot.Procurement.Application.Exceptions;

/// <summary>Thrown when a business rule (not simple DTO shape validation) is violated.</summary>
public class ProcurementValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ProcurementValidationException(string field, string message)
        : base(message)
    {
        Errors = new Dictionary<string, string[]> { [field] = [message] };
    }

    public ProcurementValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more business rule validations failed.")
    {
        Errors = errors;
    }
}
