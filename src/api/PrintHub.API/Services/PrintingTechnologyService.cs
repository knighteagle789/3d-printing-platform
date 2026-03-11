using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class PrintingTechnologyService : IPrintingTechnologyService
{
    private readonly IPrintingTechnologyRepository _technologyRepo;

    public PrintingTechnologyService(IPrintingTechnologyRepository technologyRepo)
    {
        _technologyRepo = technologyRepo;
    }

    public async Task<IEnumerable<PrintingTechnologyResponse>> GetAllAsync(bool activeOnly = true)
    {
        var technologies = await _technologyRepo.GetAllAsync(activeOnly);

        return technologies.Select(t => new PrintingTechnologyResponse(
            t.Id,
            t.Name,
            t.Description,
            t.Type.ToString(),
            t.MaxDimensions,
            t.LayerHeightRange,
            t.TypicalSpeed
        ));
    }

    public async Task<PrintingTechnologyResponse?> GetByIdAsync(Guid id)
    {
        var technology = await _technologyRepo.GetByIdAsync(id);
        if (technology == null) return null;

        return new PrintingTechnologyResponse(
            technology.Id,
            technology.Name,
            technology.Description,
            technology.Type.ToString(),
            technology.MaxDimensions,
            technology.LayerHeightRange,
            technology.TypicalSpeed
        );
    }
    
    public async Task<IEnumerable<MaterialResponse>> GetMaterialsByTechnologyAsync(Guid technologyId)
    {
        var materials = await _technologyRepo.GetMaterialsByTechnologyAsync(technologyId);

        return materials.Select(m => new MaterialResponse(
            m.Id,
            m.Type.ToString(),
            m.Color,
            m.Finish?.ToString(),
            m.Grade?.ToString(),
            m.Description,
            m.PricePerGram,
            m.IsActive,
            m.PrintingTechnology == null ? null : new PrintingTechnologyResponse(
                m.PrintingTechnology.Id,
                m.PrintingTechnology.Name,
                m.PrintingTechnology.Description,
                m.PrintingTechnology.Type.ToString(),
                m.PrintingTechnology.MaxDimensions,
                m.PrintingTechnology.LayerHeightRange,
                m.PrintingTechnology.TypicalSpeed
            )
        ));
    }
}