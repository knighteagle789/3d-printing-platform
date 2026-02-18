using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Materials;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Service for managing materials and printing technologies.
/// Handles both the public catalog and admin management operations.
/// </summary>
public interface IMaterialService
{
    // --- Public catalog ---
    Task<IReadOnlyList<MaterialResponse>> GetActiveMaterialsAsync();
    Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTypeAsync(string type);
    Task<IReadOnlyList<MaterialResponse>> GetMaterialsByTechnologyAsync(Guid technologyId);
    Task<IReadOnlyList<MaterialResponse>> SearchMaterialsAsync(string searchTerm);
    Task<MaterialResponse?> GetMaterialByIdAsync(Guid id);

    // --- Admin management ---
    Task<MaterialResponse> CreateMaterialAsync(CreateMaterialRequest request);
    Task<MaterialResponse?> UpdateMaterialAsync(Guid id, UpdateMaterialRequest request);
    Task<bool> DeleteMaterialAsync(Guid id);

    // --- Technologies ---
    Task<IReadOnlyList<PrintingTechnologyResponse>> GetAllTechnologiesAsync();
    Task<PrintingTechnologyResponse?> GetTechnologyByIdAsync(Guid id);
}