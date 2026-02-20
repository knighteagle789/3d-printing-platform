namespace PrintHub.Core.Exceptions;

/// <summary>
/// Base exception for all PrintHub business logic errors.
/// Middleware maps these to appropriate HTTP status codes.
/// </summary>
public class PrintHubException : Exception
{
    public PrintHubException(string message) : base(message) { }
    public PrintHubException(string message, Exception innerException)
        : base(message, innerException) { }
}

/// <summary>
/// Thrown when a requested resource is not found.
/// Maps to 404 Not Found.
/// </summary>
public class NotFoundException : PrintHubException
{
    public NotFoundException(string resource, Guid id)
        : base($"{resource} with ID {id} was not found.") { }

    public NotFoundException(string message) : base(message) { }
}

/// <summary>
/// Thrown when a business rule is violated.
/// Maps to 400 Bad Request.
/// </summary>
public class BusinessRuleException : PrintHubException
{
    public BusinessRuleException(string message) : base(message) { }
}

/// <summary>
/// Thrown when the user doesn't have permission for an action.
/// Maps to 403 Forbidden.
/// </summary>
public class ForbiddenException : PrintHubException
{
    public ForbiddenException(string message) : base(message) { }
}

/// <summary>
/// Thrown when there's a conflict (e.g., duplicate email).
/// Maps to 409 Conflict.
/// </summary>
public class ConflictException : PrintHubException
{
    public ConflictException(string message) : base(message) { }
}