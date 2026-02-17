using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Common;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Infrastructure.Data.Repositories;

public class ContentRepository : Repository<PortfolioItem>, IContentRepository
{
    public ContentRepository(ApplicationDbContext context) : base(context) { }

    // --- Portfolio ---

    public async Task<IReadOnlyList<PortfolioItem>> GetFeaturedPortfolioItemsAsync(int count = 6)
    {
        return await _dbSet
            .Where(p => p.IsFeatured && p.IsPublished)
            .OrderBy(p => p.DisplayOrder)
            .Take(count)
            .ToListAsync();
    }

    public async Task<PagedResult<PortfolioItem>> GetPortfolioItemsAsync(
        int page = 1, int pageSize = 12)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _dbSet.Where(p => p.IsPublished);
        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(p => p.DisplayOrder)
            .ThenByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<PortfolioItem>(items, totalCount, page, pageSize);
    }

    public async Task<IReadOnlyList<PortfolioItem>> GetPortfolioByTagAsync(string tag)
    {
        return await _dbSet
            .Where(p => p.Tags != null && p.Tags.Contains(tag))
            .OrderBy(p => p.DisplayOrder)
            .ToListAsync();
    }

    // --- Blog ---

    public async Task<PagedResult<BlogPost>> GetPublishedBlogPostsAsync(
        int page = 1, int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.BlogPosts
            .Where(b => b.IsPublished && b.PublishedAt <= DateTime.UtcNow);

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(b => b.Author)
            .OrderByDescending(b => b.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<BlogPost>(items, totalCount, page, pageSize);
    }

    public async Task<BlogPost?> GetBlogPostBySlugAsync(string slug)
    {
        return await _context.BlogPosts
            .Include(b => b.Author)
            .FirstOrDefaultAsync(b => b.Slug == slug && b.IsPublished);
    }

    public async Task<BlogPost?> GetBlogPostByIdAsync(Guid id)
    {
        return await _context.BlogPosts
            .Include(b => b.Author)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task<BlogPost> AddBlogPostAsync(BlogPost blogPost)
    {
        var entry = await _context.BlogPosts.AddAsync(blogPost);
        return entry.Entity;
    }

    public void UpdateBlogPost(BlogPost blogPost)
    {
        _context.BlogPosts.Update(blogPost);
    }

    public async Task<IReadOnlyList<string>> GetAllTagsAsync()
    {
        var portfolioTags = await _dbSet
            .Where(p => p.Tags != null)
            .SelectMany(p => p.Tags!)
            .Distinct()
            .ToListAsync();

        var blogTags = await _context.BlogPosts
            .Where(b => b.Tags != null)
            .SelectMany(b => b.Tags!)
            .Distinct()
            .ToListAsync();

        return portfolioTags
            .Union(blogTags)
            .Distinct()
            .OrderBy(t => t)
            .ToList();
    }
}