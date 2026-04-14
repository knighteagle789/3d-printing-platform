using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Files;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class FileService : IFileService
{
    private readonly IFileRepository _fileRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IFileStorageService _storageService;
    private readonly IStlAnalyzerService _analyzerService;
    private readonly ILogger<FileService> _logger;
    private readonly IRepository<FileAnalysis> _analysisRepo;
    private readonly IContentRepository _contentRepo;

    private static readonly TimeSpan FileSasTtl = TimeSpan.FromHours(1);

    public FileService(
        IFileRepository fileRepo,
        IUnitOfWork unitOfWork,
        IFileStorageService storageService,
        IStlAnalyzerService analyzerService,
        IRepository<FileAnalysis> analysisRepo,
        IContentRepository contentRepo,
        ILogger<FileService> logger)
    {
        _fileRepo = fileRepo;
        _unitOfWork = unitOfWork;
        _storageService = storageService;
        _analyzerService = analyzerService;
        _analysisRepo = analysisRepo;
        _contentRepo = contentRepo;
        _logger = logger;
    }

    public async Task<FileResponse> UploadFileAsync(Guid userId, FileUploadRequest request)
    {
        if (!Enum.TryParse<FileType>(request.FileType, ignoreCase: true, out var fileType))
            throw new BusinessRuleException($"Unsupported file type: {request.FileType}");

        var blobName = $"{Guid.NewGuid()}_{request.OriginalFileName}";

        // Upload to blob storage
        request.FileStream.Seek(0, SeekOrigin.Begin);
        var storageUrl = await _storageService.UploadFileAsync(
            request.FileStream, blobName, request.ContentType);

        var file = new UploadedFile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OriginalFileName = request.OriginalFileName,
            StorageUrl = storageUrl,
            BlobName = blobName,
            FileType = fileType,
            FileSizeBytes = request.FileSizeBytes,
            ContentType = request.ContentType,
            IsAnalyzed = false,
            UploadedAt = DateTime.UtcNow
        };

        await _fileRepo.AddAsync(file);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("File uploaded: {FileName} ({FileSize} bytes) by user {UserId}",
            request.OriginalFileName.SanitizeForLog(), request.FileSizeBytes, userId);

        // Run analysis if STL
        if (fileType == FileType.STL)
        {
            request.FileStream.Seek(0, SeekOrigin.Begin);
            var analysis = await _analyzerService.AnalyzeAsync(request.FileStream, request.OriginalFileName);

            if (analysis != null)
            {
                var fileAnalysis = new FileAnalysis
                {
                    Id = Guid.NewGuid(),
                    FileId = file.Id,
                    VolumeInCubicMm = analysis.VolumeInCubicMm,
                    SurfaceArea = analysis.SurfaceArea,
                    DimensionX = analysis.DimensionX,
                    DimensionY = analysis.DimensionY,
                    DimensionZ = analysis.DimensionZ,
                    TriangleCount = analysis.TriangleCount,
                    VertexCount = analysis.VertexCount,
                    IsManifold = analysis.IsManifold,
                    RequiresSupport = analysis.RequiresSupport,
                    EstimatedWeightGrams = analysis.EstimatedWeightGrams,
                    EstimatedPrintTimeHours = analysis.EstimatedPrintTimeHours,
                    ComplexityScore = analysis.ComplexityScore,
                    Warnings = System.Text.Json.JsonSerializer.Serialize(analysis.Warnings),
                    AnalyzedAt = DateTime.UtcNow
                };

                await _analysisRepo.AddAsync(fileAnalysis);

                file.IsAnalyzed = true;
                _fileRepo.Update(file);
                await _unitOfWork.SaveChangesAsync();

                _logger.LogInformation("File analyzed: {FileName}, volume: {Volume}mm³, weight: {Weight}g",
                    request.OriginalFileName.SanitizeForLog(), analysis.VolumeInCubicMm, analysis.EstimatedWeightGrams);
            }
        }

        return await ToSasResponseAsync(file);
    }

    public async Task<FileResponse> CompleteChunkedUploadAsync(Guid userId, FileUploadRequest request)
    {
        if (string.IsNullOrEmpty(request.BlobName) || request.BlockIds == null || request.BlockIds.Count == 0)
            throw new InvalidOperationException("BlobName and BlockIds are required for chunked uploads.");

        if (!Enum.TryParse<FileType>(request.FileType, ignoreCase: true, out var fileType))
            throw new BusinessRuleException($"Unsupported file type: {request.FileType}");

        // Commit all staged blocks into the final blob
        var storageUrl = await _storageService.CommitBlocksAsync(
            request.BlobName, request.BlockIds, request.ContentType);

        var file = new UploadedFile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OriginalFileName = request.OriginalFileName,
            StorageUrl = storageUrl,
            BlobName = request.BlobName,
            FileType = fileType,
            FileSizeBytes = request.FileSizeBytes,
            ContentType = request.ContentType,
            IsAnalyzed = false,
            UploadedAt = DateTime.UtcNow
        };

        await _fileRepo.AddAsync(file);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Chunked upload committed: {FileName} ({FileSize} bytes, {BlockCount} blocks) by user {UserId}",
            request.OriginalFileName.SanitizeForLog(), request.FileSizeBytes, request.BlockIds.Count, userId);

        // Run analysis if STL
        if (fileType == FileType.STL)
        {
            try
            {
                using var stream = await _storageService.DownloadFileAsync(request.BlobName);
                var analysis = await _analyzerService.AnalyzeAsync(stream, request.OriginalFileName);

                if (analysis != null)
                {
                    var fileAnalysis = new FileAnalysis
                    {
                        Id = Guid.NewGuid(),
                        FileId = file.Id,
                        VolumeInCubicMm = analysis.VolumeInCubicMm,
                        SurfaceArea = analysis.SurfaceArea,
                        DimensionX = analysis.DimensionX,
                        DimensionY = analysis.DimensionY,
                        DimensionZ = analysis.DimensionZ,
                        TriangleCount = analysis.TriangleCount,
                        VertexCount = analysis.VertexCount,
                        IsManifold = analysis.IsManifold,
                        RequiresSupport = analysis.RequiresSupport,
                        EstimatedWeightGrams = analysis.EstimatedWeightGrams,
                        EstimatedPrintTimeHours = analysis.EstimatedPrintTimeHours,
                        ComplexityScore = analysis.ComplexityScore,
                        Warnings = System.Text.Json.JsonSerializer.Serialize(analysis.Warnings),
                        AnalyzedAt = DateTime.UtcNow
                    };

                    await _analysisRepo.AddAsync(fileAnalysis);

                    file.IsAnalyzed = true;
                    _fileRepo.Update(file);
                    await _unitOfWork.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                // Analysis failure should not fail the upload
                _logger.LogWarning(ex,
                    "STL analysis failed for chunked upload {FileName} — file was saved successfully",
                    request.OriginalFileName.SanitizeForLog());
            }
        }

        return await ToSasResponseAsync(file);
    }

    public async Task<FileResponse?> GetFileByIdAsync(Guid fileId)
    {
        var file = await _fileRepo.GetFileWithAnalysisAsync(fileId);
        return file != null ? await ToSasResponseAsync(file) : null;
    }

    public async Task<PagedResponse<FileResponse>> GetUserFilesAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        var files = await _fileRepo.GetUserFilesAsync(userId, page, pageSize);

        // Pre-generate SAS URLs for all items so the sync mapper can use them.
        var sasUrls = new Dictionary<Guid, string>();
        foreach (var f in files.Items)
            sasUrls[f.Id] = await _storageService.GenerateSasUrlAsync(f.BlobName, FileSasTtl);

        return PagedResponse<FileResponse>.FromPagedResult(
            files,
            f => FileResponse.FromEntity(f) with { StorageUrl = sasUrls.GetValueOrDefault(f.Id, f.StorageUrl) });
    }

    public async Task<FileResponse> ClonePortfolioFileAsync(Guid portfolioItemId, Guid userId)
    {
        var item = await _contentRepo.GetByIdAsync(portfolioItemId);
        if (item == null)
            throw new NotFoundException("Portfolio item", portfolioItemId);
        if (string.IsNullOrEmpty(item.ModelFileUrl))
            throw new BusinessRuleException("This portfolio item has no model file attached.");

        // Register the URL as a file record for this user — no re-upload needed
        var fileName = Path.GetFileName(new Uri(item.ModelFileUrl).LocalPath);
        if (string.IsNullOrEmpty(fileName)) fileName = $"{item.Title}.stl";

        var file = new UploadedFile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OriginalFileName = fileName,
            StorageUrl = item.ModelFileUrl,
            BlobName = fileName,
            FileType = FileType.STL,
            FileSizeBytes = 0,
            ContentType = "application/octet-stream",
            IsAnalyzed = false,
            UploadedAt = DateTime.UtcNow
        };

        await _fileRepo.AddAsync(file);
        await _unitOfWork.SaveChangesAsync();

        return await ToSasResponseAsync(file);
    }

    public async Task DeleteFileAsync(Guid fileId, Guid userId)
    {
        var file = await _fileRepo.GetByIdAsync(fileId);
        if (file == null)
            throw new NotFoundException("File", fileId);

        if (file.UserId != userId)
        {
            _logger.LogWarning("User {UserId} attempted to delete file {FileId} owned by {OwnerId}",
                userId, fileId, file.UserId);
            throw new ForbiddenException("You do not have permission to delete this file.");
        }

        file.DeletedAt = DateTime.UtcNow;
        _fileRepo.Update(file);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("File soft-deleted: {FileId} by user {UserId}", fileId, userId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns a FileResponse with StorageUrl replaced by a short-lived SAS URL
    /// so the client can download the blob directly without a proxy.
    /// </summary>
    private async Task<FileResponse> ToSasResponseAsync(UploadedFile file)
    {
        var sasUrl = await _storageService.GenerateSasUrlAsync(file.BlobName, FileSasTtl);
        return FileResponse.FromEntity(file) with { StorageUrl = sasUrl };
    }
}