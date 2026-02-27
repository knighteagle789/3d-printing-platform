namespace PrintHub.Core.DTOs.Files;

/// <summary>
/// Metadata for a file upload.
/// The actual file stream is handled separately by the controller
/// since multipart form data doesn't map cleanly to a JSON DTO.
/// </summary>
public record FileUploadRequest(
    string OriginalFileName,
    string ContentType,
    long FileSizeBytes,
    string FileType,
    Stream FileStream);