using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
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

    // ─── Public catalog ───────────────────────────────────────────────────

    public async Task<IReadOnlyList<MaterialResponse>> GetActiveMaterialsAsync()
    {
        var materials = await _materialRepo.GetActiveMaterialsAsync();
        return materials.Select(MaterialResponse.FromEntity).ToList();
    }

    public async Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTypeAsync(string type)
    {
        if (!Enum.TryParse<MaterialType>(type, ignoreCase: true, out var materialType))
            throw new BusinessRuleException($"'{type}' is not a valid material type.");

        var materials = await _materialRepo.GetActiveMaterialsAsync();
        return materials
            .Where(m => m.Type == materialType)
            .Select(MaterialResponse.FromEntity)
            .ToList();
    }

    public async Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTechnologyAsync(Guid technologyId)
    {
        var materials = await _materialRepo.GetActiveMaterialsAsync();
        return materials
            .Where(m => m.PrintingTechnologyId == technologyId)
            .Select(MaterialResponse.FromEntity)
            .ToList();
    }

    public async Task<IReadOnlyList<MaterialResponse>> SearchMaterialsAsync(string searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return await GetActiveMaterialsAsync();

        var term = searchTerm.Trim().ToLower();
        var materials = await _materialRepo.GetActiveMaterialsAsync();

        return materials
            .Where(m =>
                m.Type.ToString().ToLower().Contains(term) ||
                m.Color.ToLower().Contains(term) ||
                (m.Description != null && m.Description.ToLower().Contains(term)))
            .Select(MaterialResponse.FromEntity)
            .ToList();
    }

    public async Task<MaterialResponse> GetMaterialByIdAsync(Guid id)
    {
        var material = await _materialRepo.GetWithTechnologyAsync(id)
            ?? throw new NotFoundException(nameof(Material), id);

        return MaterialResponse.FromEntity(material);
    }

    // ─── Admin management ─────────────────────────────────────────────────

    public async Task<IReadOnlyList<AdminMaterialResponse>> GetAllMaterialsAdminAsync()
    {
        var materials = await _materialRepo.GetAllWithTechnologyAsync();
        return materials.Select(AdminMaterialResponse.FromEntity).ToList();
    }

    public async Task<AdminMaterialResponse> GetMaterialByIdAdminAsync(Guid id)
    {
        var material = await _materialRepo.GetWithTechnologyAsync(id)
            ?? throw new NotFoundException(nameof(Material), id);

        return AdminMaterialResponse.FromEntity(material);
    }

    public async Task<AdminMaterialResponse> CreateMaterialAsync(CreateMaterialRequest request)
    {
        var material = request.ToEntity();
        await _materialRepo.AddAsync(material);
        await _unitOfWork.SaveChangesAsync();

        // Reload with technology navigation property populated
        var created = await _materialRepo.GetWithTechnologyAsync(material.Id)
            ?? throw new NotFoundException(nameof(Material), material.Id);

        _logger.LogInformation("Material created: {Type} {Color} (Id: {Id})",
            created.Type, created.Color, created.Id);

        return AdminMaterialResponse.FromEntity(created);
    }

    public async Task<AdminMaterialResponse> UpdateMaterialAsync(Guid id, UpdateMaterialRequest request)
    {
        var material = await _materialRepo.GetWithTechnologyAsync(id)
            ?? throw new NotFoundException(nameof(Material), id);

        request.ApplyToEntity(material);
        _materialRepo.Update(material);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Material updated: {Type} {Color} (Id: {Id})",
            material.Type, material.Color, material.Id);

        return AdminMaterialResponse.FromEntity(material);
    }

    public async Task DeleteMaterialAsync(Guid id)
    {
        var material = await _materialRepo.GetByIdAsync(id)
            ?? throw new NotFoundException(nameof(Material), id);

        // Soft delete — never hard delete materials since OrderItems reference them
        material.IsActive = false;
        material.UpdatedAt = DateTime.UtcNow;
        _materialRepo.Update(material);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Material deactivated: {Id}", id);
    }
}