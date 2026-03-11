using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;

namespace PrintHub.Infrastructure.Data.Repositories;

public class PrintingTechnologyRepository : IPrintingTechnologyRepository
{
    private readonly ApplicationDbContext _context;

    public PrintingTechnologyRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PrintingTechnology>> GetAllAsync(bool activeOnly = true)
    {
        var query = _context.PrintingTechnologies.AsQueryable();

        if (activeOnly)
            query = query.Where(t => t.IsActive);

        return await query
            .OrderBy(t => t.Name)
            .ToListAsync();
    }

    public async Task<PrintingTechnology?> GetByIdAsync(Guid id)
    {
        return await _context.PrintingTechnologies
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<IEnumerable<Material>> GetMaterialsByTechnologyAsync(Guid technologyId)
    {
        return await _context.Materials
            .Include(m => m.PrintingTechnology)
            .Where(m => m.PrintingTechnologyId == technologyId && m.IsActive)
            .OrderBy(m => m.Type)
            .ThenBy(m => m.Color)
            .ToListAsync();
    }
}