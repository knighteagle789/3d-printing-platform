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
}