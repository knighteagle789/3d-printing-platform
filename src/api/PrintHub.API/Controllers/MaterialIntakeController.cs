using Asp.Versioning;
using ImageMagick;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.API.Extensions;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/material-intake")]
[Authorize(Policy = "StaffOrAdmin")]
public class MaterialIntakeController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "application/octet-stream"
    };

    private readonly IMaterialIntakeService _materialIntakeService;
    private readonly IFileStorageService _fileStorageService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MaterialIntakeController> _logger;

    public MaterialIntakeController(
        IMaterialIntakeService materialIntakeService,
        IFileStorageService fileStorageService,
        IConfiguration configuration,
        ILogger<MaterialIntakeController> logger)
    {
        _materialIntakeService = materialIntakeService;
        _fileStorageService = fileStorageService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Upload a material photo and create a new intake record.
    /// Supports JPEG/PNG/WebP and HEIC/HEIF (converted server-side to normalized JPEG).
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(52_428_800)] // 50 MB
    [RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
    public async Task<ActionResult<MaterialIntakeResponse>> CreateIntake([FromForm] MaterialIntakeUploadForm form)
    {
        var correlationId = HttpContext.TraceIdentifier;
        Response.Headers.Append("X-Correlation-ID", correlationId);

        if (form.File is null || form.File.Length == 0)
        {
            return BadRequest(new { code = "no_file", message = "No file provided.", correlationId });
        }

        var maxUploadBytes = _configuration.GetValue<long?>("Intake:ImageProcessing:MaxUploadBytes") ?? 52_428_800;
        if (form.File.Length > maxUploadBytes)
        {
            return BadRequest(new
            {
                code = "file_too_large",
                message = $"Image must be <= {maxUploadBytes / (1024 * 1024)}MB.",
                correlationId
            });
        }

        var extension = Path.GetExtension(form.File.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new
            {
                code = "invalid_extension",
                message = "Only jpg, jpeg, png, webp, heic, and heif files are allowed.",
                correlationId
            });
        }

        if (!AllowedContentTypes.Contains(form.File.ContentType.ToLowerInvariant()))
        {
            return BadRequest(new
            {
                code = "invalid_content_type",
                message = "Unsupported image content type.",
                correlationId
            });
        }

        var convertHeic = _configuration.GetValue<bool?>("Intake:ImageProcessing:ConvertHeicToJpeg") ?? true;
        var isHeic = extension is ".heic" or ".heif";
        if (isHeic && !convertHeic)
        {
            return BadRequest(new
            {
                code = "heic_conversion_disabled",
                message = "HEIC/HEIF upload is currently disabled by configuration.",
                correlationId
            });
        }

        Guid userId;
        try
        {
            userId = User.GetUserId();
        }
        catch
        {
            return Unauthorized(new { code = "unauthorized", message = "User ID not found in token.", correlationId });
        }

        var sourceType = ParseSourceType(form.SourceType);
        if (sourceType is null)
        {
            return BadRequest(new
            {
                code = "invalid_source_type",
                message = "sourceType must be one of: Mobile, Webcam, FileUpload.",
                correlationId
            });
        }

        try
        {
            await using var normalizedStream = await NormalizeToJpegAsync(form.File, correlationId);

            var blobName = $"material-intake/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}.jpg";
            var photoUrl = await _fileStorageService.UploadFileAsync(normalizedStream, blobName, "image/jpeg");

            var response = await _materialIntakeService.CreateIntakeAsync(
                new CreateIntakeRequest(
                    PhotoBlobName: blobName,
                    PhotoUrl: photoUrl,
                    SourceType: sourceType.Value,
                    UploadNotes: form.UploadNotes),
                userId);

            // Queue extraction immediately after upload.
            await _materialIntakeService.TriggerExtractionAsync(response.Id, userId);

            var latest = await _materialIntakeService.GetIntakeAsync(response.Id) ?? response;

            return CreatedAtAction(
                nameof(GetIntake),
                new { version = "1.0", intakeId = response.Id },
                latest);
        }
        catch (MagickMissingDelegateErrorException ex)
        {
            _logger.LogWarning(ex,
                "Image conversion delegate missing while processing intake upload. CorrelationId: {CorrelationId}",
                correlationId);

            return UnprocessableEntity(new
            {
                code = "image_conversion_not_supported",
                message = "This image format is not supported by the current server image converter.",
                correlationId
            });
        }
        catch (MagickException ex)
        {
            _logger.LogWarning(ex,
                "Image normalization failed for intake upload. CorrelationId: {CorrelationId}",
                correlationId);

            return UnprocessableEntity(new
            {
                code = "image_normalization_failed",
                message = "Image processing failed. Try a clearer image or a different format.",
                correlationId
            });
        }
    }

    [HttpGet("{intakeId:guid}")]
    public async Task<ActionResult<MaterialIntakeResponse>> GetIntake(Guid intakeId)
    {
        var intake = await _materialIntakeService.GetIntakeAsync(intakeId);
        if (intake is null)
        {
            return NotFound();
        }

        return Ok(intake);
    }

    /// <summary>
    /// Manually trigger extraction for an intake.
    /// Primary use case: retry an intake that is currently in Failed state.
    /// </summary>
    [HttpPost("{intakeId:guid}/extract")]
    public async Task<IActionResult> TriggerExtraction(Guid intakeId)
    {
        var userId = User.GetUserId();
        await _materialIntakeService.TriggerExtractionAsync(intakeId, userId);
        return Accepted(new { intakeId, message = "Extraction queued." });
    }
    private async Task<MemoryStream> NormalizeToJpegAsync(IFormFile file, string correlationId)
    {
        var maxLongEdge = _configuration.GetValue<uint?>("Intake:ImageProcessing:MaxLongEdgePixels") ?? 2048;
        var jpegQuality = _configuration.GetValue<uint?>("Intake:ImageProcessing:JpegQuality") ?? 85;

        await using var input = file.OpenReadStream();
        using var image = new MagickImage(input);

        image.AutoOrient();
        image.Strip();

        if (image.Width > maxLongEdge || image.Height > maxLongEdge)
        {
            image.Resize(new MagickGeometry(maxLongEdge, maxLongEdge));
        }

        image.Format = MagickFormat.Jpeg;
        image.Quality = jpegQuality;

        var output = new MemoryStream();
        await image.WriteAsync(output);
        output.Position = 0;

        _logger.LogInformation(
            "Material intake image normalized to JPEG. Width={Width}, Height={Height}, Quality={Quality}, CorrelationId={CorrelationId}",
            image.Width,
            image.Height,
            jpegQuality,
            correlationId);

        return output;
    }

    private static IntakeSourceType? ParseSourceType(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return IntakeSourceType.FileUpload;
        }

        return Enum.TryParse<IntakeSourceType>(raw, ignoreCase: true, out var parsed)
            ? parsed
            : null;
    }

    public sealed class MaterialIntakeUploadForm
    {
        public IFormFile? File { get; set; }

        public string? SourceType { get; set; }

        public string? UploadNotes { get; set; }
    }
}
