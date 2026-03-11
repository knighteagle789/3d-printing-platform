using PrintHub.Core.DTOs.Materials;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Service for managing materials.
/// </summary>
public interface IMaterialService
{
    // ─── Public catalog (returns MaterialResponse — no internal fields) ───

    Task<IReadOnlyList<MaterialResponse>> GetActiveMaterialsAsync();
    Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTypeAsync(string type);
    Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTechnologyAsync(Guid technologyId);
    Task<IReadOnlyList<MaterialResponse>> SearchMaterialsAsync(string searchTerm);
    Task<MaterialResponse> GetMaterialByIdAsync(Guid id);

    // ─── Admin management (returns AdminMaterialResponse — full fields) ───

    Task<IReadOnlyList<AdminMaterialResponse>> GetAllMaterialsAdminAsync();
    Task<AdminMaterialResponse> GetMaterialByIdAdminAsync(Guid id);
    Task<AdminMaterialResponse> CreateMaterialAsync(CreateMaterialRequest request);
    Task<AdminMaterialResponse> UpdateMaterialAsync(Guid id, UpdateMaterialRequest request);
    Task DeleteMaterialAsync(Guid id);

}