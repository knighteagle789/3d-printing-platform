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

    // ─── Chunked upload ───────────────────────────────────────────────────

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

    // ─── Private helpers ──────────────────────────────────────────────────

}

// ─── Request / response records ───────────────────────────────────────────────

public record InitiateUploadRequest(string FileName);
public record InitiateUploadResponse(string BlobName);
public record CompleteUploadRequest(
    string BlobName,
    string FileName,
    string ContentType,
    long   FileSizeBytes,
    IReadOnlyList<string> BlockIds);