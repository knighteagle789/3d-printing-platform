using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Files;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class FileService : IFileService
{
    private readonly IFileRepository _fileRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<FileService> _logger;

    public FileService(
        IFileRepository fileRepo,
        IUnitOfWork unitOfWork,
        ILogger<FileService> logger)
    {
        _fileRepo = fileRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<FileResponse> UploadFileAsync(Guid userId, FileUploadRequest request)
    {
        if (!Enum.TryParse<FileType>(request.FileType, ignoreCase: true, out var fileType))
        {
            throw new InvalidOperationException(
                $"Unsupported file type: {request.FileType}");
        }

        var blobName = $"{Guid.NewGuid()}_{request.OriginalFileName}";

        var file = new UploadedFile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OriginalFileName = request.OriginalFileName,
            StorageUrl = $"placeholder://{blobName}",  // Will be set by blob storage service
            BlobName = blobName,
            FileType = fileType,
            FileSizeBytes = request.FileSizeBytes,
            ContentType = request.ContentType,
            IsAnalyzed = false,
            UploadedAt = DateTime.UtcNow
        };

        await _fileRepo.AddAsync(file);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "File uploaded: {FileName} ({FileSize} bytes) by user {UserId}",
            request.OriginalFileName, request.FileSizeBytes, userId);

        return FileResponse.FromEntity(file);
    }

    public async Task<FileResponse?> GetFileByIdAsync(Guid fileId)
    {
        var file = await _fileRepo.GetFileWithAnalysisAsync(fileId);
        return file != null ? FileResponse.FromEntity(file) : null;
    }

    public async Task<PagedResponse<FileResponse>> GetUserFilesAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        var files = await _fileRepo.GetUserFilesAsync(userId, page, pageSize);
        return PagedResponse<FileResponse>.FromPagedResult(
            files, FileResponse.FromEntity);
    }

    public async Task<bool> DeleteFileAsync(Guid fileId, Guid userId)
    {
        var file = await _fileRepo.GetByIdAsync(fileId);
        if (file == null)
            return false;

        // Verify ownership
        if (file.UserId != userId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to delete file {FileId} owned by {OwnerId}",
                userId, fileId, file.UserId);
            return false;
        }

        // Soft delete
        file.DeletedAt = DateTime.UtcNow;
        _fileRepo.Update(file);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("File soft-deleted: {FileId} by user {UserId}",
            fileId, userId);

        // Note: Actual blob deletion would be handled by a cleanup background service
        // that periodically removes blobs for soft-deleted files

        return true;
    }
}