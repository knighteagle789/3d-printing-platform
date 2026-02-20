using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Files;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileService _fileService;

    public FilesController(IFileService fileService)
    {
        _fileService = fileService;
    }

    /// <summary>
    /// Upload a 3D model file.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(104_857_600)] // 100 MB
    public async Task<ActionResult<FileResponse>> UploadFile(IFormFile file)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

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
            FileType: fileType);

        try
        {
            // TODO: Upload file bytes to Azure Blob Storage here
            // var storageUrl = await _blobService.UploadAsync(file.OpenReadStream(), ...);

            var response = await _fileService.UploadFileAsync(userId.Value, request);
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
    /// Get the current user's uploaded files.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<PagedResponse<FileResponse>>> GetMyFiles(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var files = await _fileService.GetUserFilesAsync(userId.Value, page, pageSize);
        return Ok(files);
    }

    /// <summary>
    /// Delete (soft) a file.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFile(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        await _fileService.DeleteFileAsync(id, userId.Value);
        return NoContent();
    }

    // ─── Private helpers ──────────────────────────────────────────────────

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return null;
        return userId;
    }
}