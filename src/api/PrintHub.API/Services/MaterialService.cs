using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class MaterialService : IMaterialService
{
    private readonly IMaterialRepository _materialRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<MaterialService> _logger;

    public MaterialService(
        IMaterialRepository materialRepo,
        IUnitOfWork unitOfWork,
        ILogger<MaterialService> logger)
    {
        _materialRepo = materialRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    // --- Public catalog ---

    public async Task<IReadOnlyList<MaterialResponse>> GetActiveMaterialsAsync()
    {
        var materials = await _materialRepo.GetActiveMaterialsAsync();
        return materials.Select(MaterialResponse.FromEntity).ToList();
    }

    public async Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTypeAsync(string type)
    {
        if (!Enum.TryParse<MaterialType>(type, ignoreCase: true, out var materialType))
        {
            _logger.LogWarning("Invalid material type requested: {Type}", type);
            return new List<MaterialResponse>();
        }

        var materials = await _materialRepo.GetByTypeAsync(materialType);
        return materials.Select(MaterialResponse.FromEntity).ToList();
    }

    public async Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTechnologyAsync(Guid technologyId)
    {
        var materials = await _materialRepo.GetByTechnologyAsync(technologyId);
        return materials.Select(MaterialResponse.FromEntity).ToList();
    }

    public async Task<IReadOnlyList<MaterialResponse>> SearchMaterialsAsync(string searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return new List<MaterialResponse>();

        var materials = await _materialRepo.SearchAsync(searchTerm.Trim());
        return materials.Select(MaterialResponse.FromEntity).ToList();
    }

    public async Task<MaterialResponse?> GetMaterialByIdAsync(Guid id)
    {
        var material = await _materialRepo.GetWithTechnologyAsync(id);
        return material != null ? MaterialResponse.FromEntity(material) : null;
    }

    // --- Admin management ---

    public async Task<MaterialResponse> CreateMaterialAsync(CreateMaterialRequest request)
    {
        var material = request.ToEntity();

        await _materialRepo.AddAsync(material);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Created material {MaterialId}: {MaterialName}",
            material.Id, material.Name);

        // Reload with technology to populate the response
        var created = await _materialRepo.GetWithTechnologyAsync(material.Id);
        return MaterialResponse.FromEntity(created!);
    }

    public async Task<MaterialResponse?> UpdateMaterialAsync(
        Guid id, UpdateMaterialRequest request)
    {
        var material = await _materialRepo.GetByIdAsync(id);
        if (material == null)
            return null;

        request.ApplyToEntity(material);
        _materialRepo.Update(material);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Updated material {MaterialId}: {MaterialName}",
            material.Id, material.Name);

        // Reload with technology to populate the response
        var updated = await _materialRepo.GetWithTechnologyAsync(material.Id);
        return MaterialResponse.FromEntity(updated!);
    }

    public async Task<bool> DeleteMaterialAsync(Guid id)
    {
        var material = await _materialRepo.GetByIdAsync(id);
        if (material == null)
            return false;

        material.IsActive = false;
        _materialRepo.Update(material);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Soft-deleted material {MaterialId}: {MaterialName}",
            material.Id, material.Name);

        return true;
    }

    // --- Technologies ---

    public async Task<IReadOnlyList<PrintingTechnologyResponse>> GetAllTechnologiesAsync()
    {
        var technologies = await _materialRepo.GetAllTechnologiesAsync();
        return technologies.Select(PrintingTechnologyResponse.FromEntity).ToList();
    }

    public async Task<PrintingTechnologyResponse?> GetTechnologyByIdAsync(Guid id)
    {
        var technology = await _materialRepo.GetTechnologyByIdAsync(id);
        return technology != null ? PrintingTechnologyResponse.FromEntity(technology) : null;
    }
}
