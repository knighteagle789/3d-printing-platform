using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Common;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Infrastructure.Data.Repositories;

public class FileRepository : Repository<UploadedFile>, IFileRepository
{
    public FileRepository(ApplicationDbContext context) : base(context) { }

    public async Task<PagedResult<UploadedFile>> GetUserFilesAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbSet.Where(f => f.UserId == userId);

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(f => f.Analysis)
            .OrderByDescending(f => f.UploadedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<UploadedFile>(items, totalCount, page, pageSize);
    }

    public async Task<UploadedFile?> GetFileWithAnalysisAsync(Guid fileId)
    {
        return await _dbSet
            .Include(f => f.Analysis)
            .FirstOrDefaultAsync(f => f.Id == fileId);
    }

    public async Task AddFileAnalysisAsync(FileAnalysis analysis)
    {
        await _context.FileAnalyses.AddAsync(analysis);
    }

    public async Task<IReadOnlyList<UploadedFile>> GetUnanalyzedFilesAsync(int batchSize = 10)
    {
        return await _dbSet
            .Where(f => !f.IsAnalyzed)
            .OrderBy(f => f.UploadedAt)
            .Take(batchSize)
            .ToListAsync();
    }
}