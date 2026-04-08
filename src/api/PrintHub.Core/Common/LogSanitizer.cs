namespace PrintHub.Core.Common;

/// <summary>
/// Helpers for sanitizing user-controlled strings before they reach the log sink.
/// Strips newline and carriage-return characters to prevent log injection (CWE-117).
/// </summary>
public static class LogSanitizer
{
    /// <summary>
    /// Returns the string with CR/LF characters replaced by their escape-sequence
    /// representations, preventing log-forging attacks.
    /// Returns an empty string for null input.
    /// </summary>
    public static string SanitizeForLog(this string? value)
        => value?.Replace("\r", "\\r").Replace("\n", "\\n") ?? string.Empty;
}