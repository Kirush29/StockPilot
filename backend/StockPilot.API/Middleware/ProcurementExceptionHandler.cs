using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Procurement.Application.Exceptions;

namespace StockPilot.API.Middleware;

/// <summary>
/// Translates every exception raised by the procurement module into a consistent
/// application/problem+json response instead of leaking a raw stack trace.
/// </summary>
public class ProcurementExceptionHandler(ILogger<ProcurementExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title) = exception switch
        {
            ProcurementNotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
            ProcurementValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            BudgetExceededException => (StatusCodes.Status422UnprocessableEntity, "Budget exceeded"),
            ApprovalLimitExceededException => (StatusCodes.Status403Forbidden, "Approval limit exceeded"),
            ProcurementForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
            InvalidStateTransitionException => (StatusCodes.Status409Conflict, "Invalid state transition"),
            ProcurementConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception processing {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        }
        else
        {
            logger.LogInformation(
                "{ExceptionType} handled for {Method} {Path}: {Message}",
                exception.GetType().Name, httpContext.Request.Method, httpContext.Request.Path, exception.Message);
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path,
            Type = $"https://httpstatuses.io/{statusCode}"
        };

        if (exception is ProcurementValidationException validationException)
        {
            problemDetails.Extensions["errors"] = validationException.Errors;
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
