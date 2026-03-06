namespace PrintHub.Core.DTOs.Files;

/// <summary>
/// Returned when a portfolio model file is cloned into a user's file library.
/// </summary>
public record ClonePortfolioFileResponse(
    Guid FileId,
    string OriginalFileName,
    string StorageUrl);