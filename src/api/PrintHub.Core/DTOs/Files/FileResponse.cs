using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Files;

/// <summary>
/// Full file data returned by the API.
/// Used on the file detail page and "My Files" list.
/// </summary>
public record FileResponse(
    Guid Id,
    string OriginalFileName,
    string StorageUrl,
    string FileType,
    long FileSizeBytes,
    string? ContentType,
    bool IsAnalyzed,
    DateTime UploadedAt,
    FileAnalysisResponse? Analysis)
{
    public static FileResponse FromEntity(UploadedFile file) => new(
        Id: file.Id,
        OriginalFileName: file.OriginalFileName,
        StorageUrl: file.StorageUrl,
        FileType: file.FileType.ToString(),
        FileSizeBytes: file.FileSizeBytes,
        ContentType: file.ContentType,
        IsAnalyzed: file.IsAnalyzed,
        UploadedAt: file.UploadedAt,
        Analysis: file.Analysis != null
            ? FileAnalysisResponse.FromEntity(file.Analysis)
            : null
    );
}