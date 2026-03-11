using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PrintingTechnologiesController : ControllerBase
{
    private readonly IPrintingTechnologyService _technologyService;

    public PrintingTechnologiesController(IPrintingTechnologyService technologyService)
    {
        _technologyService = technologyService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PrintingTechnologyResponse>>> GetAll()
    {
        var technologies = await _technologyService.GetAllAsync();
        return Ok(technologies);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PrintingTechnologyResponse>> GetById(Guid id)
    {
        var technology = await _technologyService.GetByIdAsync(id);
        return technology == null ? NotFound() : Ok(technology);
    }

    /// <summary>
    /// Get active materials compatible with a specific printing technology.
    /// </summary>
    [HttpGet("{id:guid}/materials")]
    public async Task<ActionResult<IEnumerable<MaterialResponse>>> GetMaterials(Guid id)
    {
        var materials = await _technologyService.GetMaterialsByTechnologyAsync(id);
        return Ok(materials);
    }
}