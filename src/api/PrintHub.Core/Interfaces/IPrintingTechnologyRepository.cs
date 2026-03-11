using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

public interface IPrintingTechnologyRepository
{
    Task<IEnumerable<PrintingTechnology>> GetAllAsync(bool activeOnly = true);
    Task<PrintingTechnology?> GetByIdAsync(Guid id);
    Task<IEnumerable<Material>> GetMaterialsByTechnologyAsync(Guid technologyId);
}