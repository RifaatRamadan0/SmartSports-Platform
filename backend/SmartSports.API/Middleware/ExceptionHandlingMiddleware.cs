using System.Net;
using System.Text.Json;
using SmartSports.Domain.Exceptions;

namespace SmartSports.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — nothing to write back, no error to log.
        }
        catch (Exception ex)
        {
            // Expected domain rejections map to 4xx and are part of normal request flow —
            // log at Warning without a stack trace. Anything else is an unexpected bug
            // (maps to 500) and deserves a full Error-level stack trace.
            if (ex is ForbiddenException
                   or KeyNotFoundException
                   or ArgumentException
                   or ConflictException
                   or UnauthorizedAccessException)
                _logger.LogWarning("Request rejected ({Type}): {Message}",
                    ex.GetType().Name, ex.Message);
            else
                _logger.LogError(ex, "Unhandled exception occurred.");

            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = exception switch
        {
            ForbiddenException          => HttpStatusCode.Forbidden,
            UnauthorizedAccessException => HttpStatusCode.Unauthorized,
            KeyNotFoundException        => HttpStatusCode.NotFound,
            ArgumentException           => HttpStatusCode.BadRequest,
            ConflictException           => HttpStatusCode.Conflict,
            _                           => HttpStatusCode.InternalServerError
        };

        var message = statusCode == HttpStatusCode.InternalServerError
            ? "An unexpected error occurred."
            : exception.Message;

        var response = new
        {
            status = (int)statusCode,
            message
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        return context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}