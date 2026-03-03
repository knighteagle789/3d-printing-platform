using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class MaterialsController : ControllerBase
{
    private readonly IMaterialService _materialService;

    public MaterialsController(IMaterialService materialService)
    {
        _materialService = materialService;
    }

    // ─── Public endpoints (no auth required) ──────────────────────────────

    /// <summary>
    /// Get all active materials in the catalog.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> GetMaterials()
    {
        var materials = await _materialService.GetActiveMaterialsAsync();
        return Ok(materials);
    }

    /// <summary>
    /// Get all materials, including inactive ones. Admins only.
    /// </summary>
    [HttpGet("admin/all")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> GetAllMaterials()
    {
        var materials = await _materialService.GetAllMaterialsAsync();
        return Ok(materials);
    }

    /// <summary>
    /// Get a specific material by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MaterialResponse>> GetMaterial(Guid id)
    {
        var material = await _materialService.GetMaterialByIdAsync(id);
        return Ok(material);
    }

    /// <summary>
    /// Get materials filtered by type (e.g., PLA, ABS, PETG).
    /// </summary>
    [HttpGet("type/{type}")]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> GetMaterialsByType(
        string type)
    {
        var materials = await _materialService.GetMaterialsByTypeAsync(type);
        return Ok(materials);
    }

    /// <summary>
    /// Get materials compatible with a specific printing technology.
    /// </summary>
    [HttpGet("technology/{technologyId:guid}")]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> GetMaterialsByTechnology(
        Guid technologyId)
    {
        var materials = await _materialService.GetMaterialsByTechnologyAsync(technologyId);
        return Ok(materials);
    }

    /// <summary>
    /// Search materials by name or description.
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> SearchMaterials(
        [FromQuery] string q)
    {
        var materials = await _materialService.SearchMaterialsAsync(q);
        return Ok(materials);
    }

    // ─── Technologies ─────────────────────────────────────────────────────

    /// <summary>
    /// Get all printing technologies.
    /// </summary>
    [HttpGet("technologies")]
    public async Task<ActionResult<IReadOnlyList<PrintingTechnologyResponse>>>
        GetTechnologies()
    {
        var technologies = await _materialService.GetAllTechnologiesAsync();
        return Ok(technologies);
    }

    /// <summary>
    /// Get a specific printing technology by ID.
    /// </summary>
    [HttpGet("technologies/{id:guid}")]
    public async Task<ActionResult<PrintingTechnologyResponse>> GetTechnology(Guid id)
    {
        var technology = await _materialService.GetTechnologyByIdAsync(id);
        return Ok(technology);
    }

    // ─── Admin endpoints ──────────────────────────────────────────────────

    /// <summary>
    /// Create a new material. Requires Admin or Staff role.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<MaterialResponse>> CreateMaterial(
        CreateMaterialRequest request)
    {
        var material = await _materialService.CreateMaterialAsync(request);
        return CreatedAtAction(
            nameof(GetMaterial),
            new { id = material.Id },
            material);
    }

    /// <summary>
    /// Update an existing material. Requires Admin or Staff role.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<MaterialResponse>> UpdateMaterial(
        Guid id, UpdateMaterialRequest request)
    {
        var material = await _materialService.UpdateMaterialAsync(id, request);
        return Ok(material);
    }

    /// <summary>
    /// Soft-delete a material. Requires Admin role.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteMaterial(Guid id)
    {
        await _materialService.DeleteMaterialAsync(id);
        return NoContent();
    }
}