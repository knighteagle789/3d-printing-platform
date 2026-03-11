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

    // ─── Public endpoints ─────────────────────────────────────────────────

    /// <summary>Get all active materials. Safe for anonymous/customer use.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> GetMaterials()
    {
        var materials = await _materialService.GetActiveMaterialsAsync();
        return Ok(materials);
    }

    /// <summary>Get a single material by ID. Public — returns only safe fields.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MaterialResponse>> GetMaterial(Guid id)
    {
        var material = await _materialService.GetMaterialByIdAsync(id);
        return Ok(material);
    }

    /// <summary>Get active materials filtered by type (e.g. PLA, ABS, PETG).</summary>
    [HttpGet("type/{type}")]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> GetMaterialsByType(string type)
    {
        var materials = await _materialService.GetMaterialsByTypeAsync(type);
        return Ok(materials);
    }

    
    /// <summary>Search active materials by type, color, or description.</summary>
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<MaterialResponse>>> SearchMaterials(
        [FromQuery] string q)
    {
        var materials = await _materialService.SearchMaterialsAsync(q);
        return Ok(materials);
    }

    // ─── Admin endpoints ──────────────────────────────────────────────────

    /// <summary>
    /// Get all materials including inactive. Returns full admin fields.
    /// </summary>
    [HttpGet("admin/all")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<IReadOnlyList<AdminMaterialResponse>>> GetAllMaterialsAdmin()
    {
        var materials = await _materialService.GetAllMaterialsAdminAsync();
        return Ok(materials);
    }

    /// <summary>
    /// Get a single material by ID with full admin fields.
    /// </summary>
    [HttpGet("admin/{id:guid}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<AdminMaterialResponse>> GetMaterialAdmin(Guid id)
    {
        var material = await _materialService.GetMaterialByIdAdminAsync(id);
        return Ok(material);
    }

    /// <summary>Create a new material stock item.</summary>
    [HttpPost]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<AdminMaterialResponse>> CreateMaterial(
        [FromBody] CreateMaterialRequest request)
    {
        var material = await _materialService.CreateMaterialAsync(request);
        return CreatedAtAction(nameof(GetMaterialAdmin), new { id = material.Id }, material);
    }

    /// <summary>Update an existing material.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<AdminMaterialResponse>> UpdateMaterial(
        Guid id, [FromBody] UpdateMaterialRequest request)
    {
        var material = await _materialService.UpdateMaterialAsync(id, request);
        return Ok(material);
    }

    /// <summary>Deactivate a material (soft delete).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> DeleteMaterial(Guid id)
    {
        await _materialService.DeleteMaterialAsync(id);
        return NoContent();
    }


}