namespace PrintHub.Core.DTOs.Files;

/// <summary>
/// Metadata for a file upload.
/// The actual file stream is handled separately by the controller
/// since multipart form data doesn't map cleanly to a JSON DTO.
/// For chunked uploads, FileStream is unused — BlobName and BlockIds are used instead.
/// </summary>
public record FileUploadRequest(
    string OriginalFileName,
    string ContentType,
    long FileSizeBytes,
    string FileType,
    Stream FileStream,
    string? BlobName = null,
    IReadOnlyList<string>? BlockIds = null);