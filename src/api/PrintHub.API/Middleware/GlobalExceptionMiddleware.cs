using System.Diagnostics;
using PrintHub.Core.Exceptions;

namespace PrintHub.API.Middleware;

/// <summary>
/// Catches all unhandled exceptions and returns consistent error responses.
/// Sits at the top of the middleware pipeline so it catches everything.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        // Determine status code and message based on exception type
        var (statusCode, message) = exception switch
        {
            NotFoundException ex => (StatusCodes.Status404NotFound, ex.Message),
            BusinessRuleException ex => (StatusCodes.Status400BadRequest, ex.Message),
            ForbiddenException ex => (StatusCodes.Status403Forbidden, ex.Message),
            ConflictException ex => (StatusCodes.Status409Conflict, ex.Message),
            InvalidIntakeTransitionException ex => (StatusCodes.Status409Conflict, ex.Message),
            InvalidOperationException ex => (StatusCodes.Status400BadRequest, ex.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized."),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
        };

        // Log based on severity
        if (statusCode >= 500)
        {
            _logger.LogError(exception,
                "Unhandled exception. TraceId: {TraceId}, Path: {Path}",
                traceId, context.Request.Path);
        }
        else
        {
            _logger.LogWarning(
                "Request failed with {StatusCode}: {Message}. TraceId: {TraceId}, Path: {Path}",
                statusCode, message, traceId, context.Request.Path);
        }

        // Build response
        var response = new ApiErrorResponse
        {
            StatusCode = statusCode,
            Message = message,
            TraceId = traceId,
            Detail = _environment.IsDevelopment() && statusCode >= 500
                ? exception.ToString()
                : null
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(response);
    }
}