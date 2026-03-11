using PrintHub.Core.DTOs.Materials;

namespace PrintHub.Core.Interfaces.Services;

public interface IPrintingTechnologyService
{
    Task<IEnumerable<PrintingTechnologyResponse>> GetAllAsync(bool activeOnly = true);
    Task<PrintingTechnologyResponse?> GetByIdAsync(Guid id);
    Task<IEnumerable<MaterialResponse>> GetMaterialsByTechnologyAsync(Guid technologyId);
}