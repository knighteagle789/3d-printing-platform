using System.IO.Compression;
using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Files;
using PrintHub.Core.Interfaces.Services;
using PrintHub.API.Extensions;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileService _fileService;
    private readonly IFileStorageService _storageService;

    public FilesController(IFileService fileService, IFileStorageService storageService)
    {
        _fileService = fileService;
        _storageService = storageService;
    }

    /// <summary>
    /// Upload a 3D model file.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(262_144_000)]                              // 250MB
    [RequestFormLimits(MultipartBodyLengthLimit = 262_144_000)]  // 250MB
    public async Task<ActionResult<FileResponse>> UploadFile(IFormFile file)
    {
        var userId = User.GetUserId();
        
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        // Validate file extension
        var allowedExtensions = new[] { ".stl", ".obj", ".3mf", ".step", ".iges", ".gcode", ".amf", ".ply" };
        var extension = Path.GetExtension(file.FileName).ToLower();
        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { message = $"File type '{extension}' is not supported." });

        // Map extension to FileType string
        var fileType = extension.TrimStart('.').ToUpper();
        if (fileType == "3MF") fileType = "ThreeMF";

        var request = new FileUploadRequest(
            OriginalFileName: file.FileName,
            ContentType: file.ContentType,
            FileSizeBytes: file.Length,
            FileType: fileType,
            FileStream: file.OpenReadStream());

        try
        {
            var response = await _fileService.UploadFileAsync(userId, request);
            return CreatedAtAction(
                nameof(GetFile),
                new { id = response.Id },
                response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific file by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FileResponse>> GetFile(Guid id)
    {
        var fileResponse = await _fileService.GetFileByIdAsync(id);
        if (fileResponse == null) return NotFound();
        return Ok(fileResponse);
    }

    /// <summary>
    /// Clone a portfolio item's model file into the current user's files.
    /// </summary>
    [HttpPost("clone-portfolio/{portfolioItemId:guid}")]
    [Authorize]
    public async Task<ActionResult<FileResponse>> ClonePortfolioFile(Guid portfolioItemId)
    {
        var userId = User.GetUserId();
        var file = await _fileService.ClonePortfolioFileAsync(portfolioItemId, userId);
        return Ok(file);
    }

    /// <summary>
    /// Get the current user's uploaded files.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<PagedResponse<FileResponse>>> GetMyFiles(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.GetUserId();
        var files = await _fileService.GetUserFilesAsync(userId, page, pageSize);
        return Ok(files);
    }

    /// <summary>
    /// Delete (soft) a file.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFile(Guid id)
    {
        var userId = User.GetUserId();
        await _fileService.DeleteFileAsync(id, userId);
        return NoContent();
    }

    /// <summary>
    /// Upload an image for use in portfolio or blog content (admin only).
    /// Returns the public URL — no DB record is created.
    /// </summary>
    [HttpPost("upload-image")]
    [Authorize(Roles = "Admin,Staff")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)] // 10 MB
    public async Task<ActionResult<object>> UploadImage(IFormFile file)
    {
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only JPEG, PNG, WebP and GIF images are allowed." });

        const long maxSize = 10 * 1024 * 1024; // 10MB
        if (file.Length > maxSize)
            return BadRequest(new { message = "Image must be under 10MB." });

        var ext = Path.GetExtension(file.FileName).ToLower();
        var blobName = $"images/{Guid.NewGuid()}{ext}";

        using var stream = file.OpenReadStream();
        var url = await _storageService.UploadFileAsync(stream, blobName, file.ContentType);

        return Ok(new { url });
    }

    /// <summary>
    /// Upload a timelapse video for portfolio items (admin only).
    /// Returns the public URL — no DB record is created.
    /// </summary>
    [HttpPost("upload-video")]
    [Authorize(Roles = "Admin,Staff")]
    [RequestSizeLimit(524_288_000)] // 500 MB
    [RequestFormLimits(MultipartBodyLengthLimit = 524_288_000)] // 500 MB
    public async Task<ActionResult<object>> UploadVideo(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext != ".mp4")
            return BadRequest(new { message = "Only MP4 videos are allowed." });

        const long maxSize = 500 * 1024 * 1024; // 500MB
        if (file.Length > maxSize)
            return BadRequest(new { message = "Video must be under 500MB." });

        var blobName = $"videos/{Guid.NewGuid()}.mp4";

        using var stream = file.OpenReadStream();
        var url = await _storageService.UploadFileAsync(stream, blobName, "video/mp4");

        return Ok(new { url });
    }

    // ─── Chunked upload ────────────────────────────────────────────────────

    /// <summary>
    /// Initiate a chunked upload session.
    /// Returns a blobName to use for all subsequent block uploads.
    /// </summary>
    [HttpPost("upload/initiate")]
    public ActionResult<InitiateUploadResponse> InitiateUpload([FromBody] InitiateUploadRequest request)
    {
        var allowedExtensions = new[] { ".stl", ".obj", ".3mf", ".step", ".iges", ".gcode", ".amf", ".ply" };
        var ext = Path.GetExtension(request.FileName).ToLower();
        if (!allowedExtensions.Contains(ext))
            return BadRequest(new { message = $"File type '{ext}' is not supported." });

        var blobName = $"uploads/{Guid.NewGuid()}_{request.FileName}";
        return Ok(new InitiateUploadResponse(blobName));
    }

    /// <summary>
    /// Upload a single block as part of a chunked upload.
    /// blockId must be a base64-encoded string of equal length across all blocks.
    /// </summary>
    [HttpPut("upload/block")]
    [RequestSizeLimit(6_291_456)]                              // 6MB — slightly over 4MB chunk + headers
    [RequestFormLimits(MultipartBodyLengthLimit = 6_291_456)]
    public async Task<IActionResult> UploadBlock(
        [FromQuery] string blobName,
        [FromQuery] string blockId,
        IFormFile block)
    {
        if (string.IsNullOrWhiteSpace(blobName) || string.IsNullOrWhiteSpace(blockId))
            return BadRequest(new { message = "blobName and blockId are required." });

        if (block == null || block.Length == 0)
            return BadRequest(new { message = "No block data provided." });

        await _storageService.StageBlockAsync(blobName, blockId, block.OpenReadStream());
        return NoContent();
    }

    /// <summary>
    /// Commit all staged blocks, create the file record, and run analysis.
    /// </summary>
    [HttpPost("upload/complete")]
    public async Task<ActionResult<FileResponse>> CompleteUpload(
        [FromBody] CompleteUploadRequest request)
    {
        var userId = User.GetUserId();

        var allowedExtensions = new[] { ".stl", ".obj", ".3mf", ".step", ".iges", ".gcode", ".amf", ".ply" };
        var ext = Path.GetExtension(request.FileName).ToLower();
        if (!allowedExtensions.Contains(ext))
            return BadRequest(new { message = $"File type '{ext}' is not supported." });

        var fileType = ext.TrimStart('.').ToUpper();
        if (fileType == "3MF") fileType = "ThreeMF";

        try
        {
            var fileUploadRequest = new FileUploadRequest(
                OriginalFileName: request.FileName,
                ContentType:      request.ContentType,
                FileSizeBytes:    request.FileSizeBytes,
                FileType:         fileType,
                FileStream:       Stream.Null, // not used for chunked path
                BlobName:         request.BlobName,
                BlockIds:         request.BlockIds);

            var response = await _fileService.CompleteChunkedUploadAsync(userId, fileUploadRequest);
            return CreatedAtAction(nameof(GetFile), new { id = response.Id }, response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── ZIP bulk upload ─────────────────────────────────────────────────────

    /// <summary>
    /// Upload a ZIP archive containing one or more 3D model files.
    /// Each supported file inside the archive is extracted and stored as a separate upload.
    /// Returns a summary with the list of successfully created file records and any skipped entries.
    /// Supports up to 25 model files per archive; unsupported extensions are silently skipped.
    /// </summary>
    [HttpPost("upload-zip")]
    [RequestSizeLimit(262_144_000)]                              // 250MB total ZIP
    [RequestFormLimits(MultipartBodyLengthLimit = 262_144_000)]
    public async Task<ActionResult<ZipUploadResponse>> UploadZip(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext != ".zip")
            return BadRequest(new { message = "Only .zip archives are supported by this endpoint." });

        var userId = User.GetUserId();
        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { ".stl", ".obj", ".3mf", ".step", ".iges", ".amf", ".ply" };

        var uploaded = new List<FileResponse>();
        var skipped  = new List<string>();

        using var zipStream = file.OpenReadStream();
        using var archive   = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: false);

        // Filter to valid model entries (skip directories and unsupported extensions).
        var modelEntries = archive.Entries
            .Where(e => !string.IsNullOrEmpty(e.Name) &&
                        allowedExtensions.Contains(Path.GetExtension(e.Name)))
            .ToList();

        if (modelEntries.Count == 0)
            return BadRequest(new { message = "The archive contains no supported 3D model files (.stl, .obj, .3mf, .step, .iges, .amf, .ply)." });

        if (modelEntries.Count > 25)
            return BadRequest(new { message = $"The archive contains {modelEntries.Count} model files, which exceeds the limit of 25 per upload." });

        // Track skipped entries (wrong extension).
        skipped.AddRange(archive.Entries
            .Where(e => !string.IsNullOrEmpty(e.Name) &&
                        !allowedExtensions.Contains(Path.GetExtension(e.Name)) &&
                        e.Length > 0)
            .Select(e => e.Name));

        foreach (var entry in modelEntries)
        {
            // Buffer each entry so the ZIP stream position doesn't interfere.
            using var entryStream = entry.Open();
            using var buffer      = new MemoryStream((int)Math.Min(entry.Length, 256 * 1024 * 1024));
            await entryStream.CopyToAsync(buffer);
            buffer.Position = 0;

            var entryExt      = Path.GetExtension(entry.Name).ToLower();
            var fileType      = entryExt.TrimStart('.').ToUpper();
            if (fileType == "3MF") fileType = "ThreeMF";
            var contentType   = entryExt == ".stl" ? "application/octet-stream" : "application/octet-stream";

            var uploadRequest = new FileUploadRequest(
                OriginalFileName: entry.Name,
                ContentType:      contentType,
                FileSizeBytes:    buffer.Length,
                FileType:         fileType,
                FileStream:       buffer);

            try
            {
                var result = await _fileService.UploadFileAsync(userId, uploadRequest);
                uploaded.Add(result);
            }
            catch (Exception ex)
            {
                // Log and record as skipped — don't fail the whole batch.
                skipped.Add(entry.Name);
                // We don't have a logger injected here; rely on middleware to log unhandled paths.
                _ = ex; // suppress unused-variable warning
            }
        }

        return Ok(new ZipUploadResponse(
            Uploaded: uploaded,
            SkippedFiles: skipped,
            TotalExtracted: modelEntries.Count,
            SuccessCount: uploaded.Count,
            SkippedCount: skipped.Count));
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

}

// ─── Request / response records ───────────────────────────────────────────────────────────────

public record InitiateUploadRequest(string FileName);
public record InitiateUploadResponse(string BlobName);
public record CompleteUploadRequest(
    string BlobName,
    string FileName,
    string ContentType,
    long   FileSizeBytes,
    IReadOnlyList<string> BlockIds);

public record ZipUploadResponse(
    IReadOnlyList<FileResponse> Uploaded,
    IReadOnlyList<string> SkippedFiles,
    int TotalExtracted,
    int SuccessCount,
    int SkippedCount);
