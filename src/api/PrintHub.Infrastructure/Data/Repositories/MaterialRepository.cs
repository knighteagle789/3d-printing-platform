using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Infrastructure.Data.Repositories;

public class MaterialRepository : Repository<Material>, IMaterialRepository
{
    public MaterialRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IReadOnlyList<Material>> GetActiveMaterialsAsync()
    {
        return await _dbSet
            .Where(m => m.IsActive)
            .Include(m => m.PrintingTechnology)
            .OrderBy(m => m.Type)
            .ThenBy(m => m.Color)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Material>> GetAllWithTechnologyAsync()
    {
        return await _dbSet
            .Include(m => m.PrintingTechnology)
            .OrderBy(m => m.IsActive ? 0 : 1)
            .ThenBy(m => m.Type)
            .ThenBy(m => m.Color)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Material>> GetByTypeAsync(MaterialType type)
    {
        return await _dbSet
            .Where(m => m.Type == type && m.IsActive)
            .Include(m => m.PrintingTechnology)
            .OrderBy(m => m.Color)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Material>> GetByTechnologyAsync(Guid technologyId)
    {
        return await _dbSet
            .Where(m => m.PrintingTechnologyId == technologyId && m.IsActive)
            .Include(m => m.PrintingTechnology)
            .OrderBy(m => m.Type)
            .ThenBy(m => m.Color)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Material>> SearchAsync(string searchTerm)
    {
        var term = searchTerm.ToLower();

        return await _dbSet
            .Where(m => m.IsActive &&
                (m.Type.ToString().ToLower().Contains(term) ||
                 m.Color.ToLower().Contains(term) ||
                 (m.Description != null && m.Description.ToLower().Contains(term))))
            .Include(m => m.PrintingTechnology)
            .OrderBy(m => m.Type)
            .ThenBy(m => m.Color)
            .ToListAsync();
    }

    public async Task<Material?> GetWithTechnologyAsync(Guid materialId)
    {
        return await _dbSet
            .Include(m => m.PrintingTechnology)
            .FirstOrDefaultAsync(m => m.Id == materialId);
    }

    public async Task<IReadOnlyList<PrintingTechnology>> GetAllTechnologiesAsync()
    {
        return await _context.PrintingTechnologies
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .ToListAsync();
    }

    public async Task<PrintingTechnology?> GetTechnologyByIdAsync(Guid id)
    {
        return await _context.PrintingTechnologies.FindAsync(id);
    }

    public async Task<IReadOnlyList<Material>> FindDuplicatesAsync(MaterialType type, string color, string? brand)
    {
        var colorNorm = color.Trim().ToUpperInvariant();

        var query = _dbSet
            .Where(m => m.IsActive && m.Type == type &&
                        m.Color.ToUpper().Trim() == colorNorm);

        if (brand is not null)
        {
            var brandNorm = brand.Trim().ToUpperInvariant();
            query = query.Where(m => m.Brand != null && m.Brand.ToUpper().Trim() == brandNorm);
        }
        else
        {
            query = query.Where(m => m.Brand == null);
        }

        return await query.OrderBy(m => m.CreatedAt).ToListAsync();
    }
}