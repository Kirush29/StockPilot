using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Procurement.Application.Exceptions;

namespace StockPilot.Procurement.Api.Common;

[ApiController]
public abstract class ProcurementControllerBase : ControllerBase
{
    /// <summary>Runs a FluentValidation validator and throws a ProcurementValidationException (400) on failure.</summary>
    protected static async Task ValidateAsync<T>(IValidator<T> validator, T model, CancellationToken cancellationToken)
    {
        var result = await validator.ValidateAsync(model, cancellationToken);
        if (!result.IsValid)
        {
            var errors = result.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new ProcurementValidationException(errors);
        }
    }
}
