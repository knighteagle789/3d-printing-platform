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

    public FileService(
        IFileRepository fileRepo,
        IUnitOfWork unitOfWork,
        IFileStorageService storageService,
        IStlAnalyzerService analyzerService,
        IRepository<FileAnalysis> analysisRepo,
        ILogger<FileService> logger)
    {
        _fileRepo = fileRepo;
        _unitOfWork = unitOfWork;
        _storageService = storageService;
        _analyzerService = analyzerService;
        _analysisRepo = analysisRepo;
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
            request.OriginalFileName, request.FileSizeBytes, userId);

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
                    request.OriginalFileName, analysis.VolumeInCubicMm, analysis.EstimatedWeightGrams);
            }
        }

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
        return PagedResponse<FileResponse>.FromPagedResult(files, FileResponse.FromEntity);
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
}