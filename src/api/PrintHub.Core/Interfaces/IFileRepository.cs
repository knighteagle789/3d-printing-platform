using PrintHub.Core.Common;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Repository for UploadedFile and FileAnalysis entities.
/// Manages 3D model file metadata and analysis results.
///
/// Note: This repository handles DATABASE records only.
/// Actual file storage (blob upload/download) is handled by
/// IFileStorageService in the service layer.
/// </summary>
public interface IFileRepository : IRepository<UploadedFile>
{
    Task<PagedResult<UploadedFile>> GetUserFilesAsync(Guid userId, int page = 1, int pageSize = 20);

    Task<UploadedFile?> GetFileWithAnalysisAsync(Guid fileId);

    Task AddFileAnalysisAsync(FileAnalysis analysis);

    Task<IReadOnlyList<UploadedFile>> GetUnanalyzedFilesAsync(int batchSize = 10);
}