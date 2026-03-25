using PrintHub.Core.Common;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Repository for Material and PrintingTechnology entities.
/// Supports the public material catalog and admin material management.
/// </summary>
public interface IMaterialRepository : IRepository<Material>
{
    Task<IReadOnlyList<Material>> GetActiveMaterialsAsync();

    Task<IReadOnlyList<Material>> GetAllWithTechnologyAsync();

    Task<IReadOnlyList<Material>> GetByTypeAsync(MaterialType type);

    Task<IReadOnlyList<Material>> GetByTechnologyAsync(Guid technologyId);

    Task<IReadOnlyList<Material>> SearchAsync(string searchTerm);

    Task<Material?> GetWithTechnologyAsync(Guid materialId);

    Task<IReadOnlyList<PrintingTechnology>> GetAllTechnologiesAsync();

    Task<PrintingTechnology?> GetTechnologyByIdAsync(Guid id);

    /// <summary>
    /// Returns active materials that match the given type, color (case-insensitive), and brand.
    /// Used during intake approval to detect potential duplicates before creating a new material.
    /// </summary>
    Task<IReadOnlyList<Material>> FindDuplicatesAsync(MaterialType type, string color, string? brand);
}