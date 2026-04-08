using System.Text.Json.Serialization;

namespace PrintHub.API.Middleware;

/// <summary>
/// Standardized error response returned by the API.
/// Every error — validation, business logic, server — uses this format.
/// </summary>
public class ApiErrorResponse
{
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Detail { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TraceId { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string[]>? Errors { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Data { get; set; }
}