using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Files;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Service for file upload management and analysis coordination.
/// Handles metadata — actual file storage is delegated to a storage service.
/// </summary>
public interface IFileService
{
    Task<FileResponse> UploadFileAsync(Guid userId, FileUploadRequest request);
    Task<FileResponse> CompleteChunkedUploadAsync(Guid userId, FileUploadRequest request);
    Task<FileResponse?> GetFileByIdAsync(Guid fileId);
    Task<FileResponse> ClonePortfolioFileAsync(Guid portfolioItemId, Guid userId);
    Task<PagedResponse<FileResponse>> GetUserFilesAsync(
        Guid userId, int page = 1, int pageSize = 20);
    Task DeleteFileAsync(Guid fileId, Guid userId);
}