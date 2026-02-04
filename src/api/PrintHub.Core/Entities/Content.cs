using System;
using System.Collections.Generic;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a portfolio item showcasing completed work
    /// </summary>
    public class PortfolioItem
    {
        public Guid Id { get; set; }
        
        public string Title { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public string? DetailedDescription { get; set; }
        
        /// <summary>
        /// Main display image URL
        /// </summary>
        public string ImageUrl { get; set; } = string.Empty;
        
        /// <summary>
        /// Additional image URLs (JSON array)
        /// </summary>
        public string? AdditionalImages { get; set; }
        
        /// <summary>
        /// Tags for categorization (comma-separated or JSON)
        /// </summary>
        public string? Tags { get; set; }
        
        public Guid? MaterialId { get; set; }
        
        public bool IsFeatured { get; set; }
        
        public int DisplayOrder { get; set; }
        
        public PortfolioCategory Category { get; set; }
        
        /// <summary>
        /// Estimated project details (JSON)
        /// </summary>
        public string? ProjectDetails { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
        
        public bool IsPublished { get; set; } = true;
        
        // Navigation properties
        public virtual Material? Material { get; set; }
    }
    
    /// <summary>
    /// Portfolio categories
    /// </summary>
    public enum PortfolioCategory
    {
        Prototyping,
        Automotive,
        Aerospace,
        Medical,
        Architecture,
        Art,
        Fashion,
        Jewelry,
        Industrial,
        Consumer,
        Educational,
        Other
    }
    
    /// <summary>
    /// Represents a blog post
    /// </summary>
    public class BlogPost
    {
        public Guid Id { get; set; }
        
        public string Title { get; set; } = string.Empty;
        
        public string Slug { get; set; } = string.Empty;
        
        public string Summary { get; set; } = string.Empty;
        
        public string Content { get; set; } = string.Empty;
        
        public string? FeaturedImageUrl { get; set; }
        
        public Guid AuthorId { get; set; }
        
        public BlogCategory Category { get; set; }
        
        /// <summary>
        /// Tags for categorization (comma-separated or JSON)
        /// </summary>
        public string? Tags { get; set; }
        
        public bool IsPublished { get; set; }
        
        public DateTime? PublishedAt { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
        
        /// <summary>
        /// View count for analytics
        /// </summary>
        public int ViewCount { get; set; }
        
        // Navigation properties
        public virtual User Author { get; set; } = null!;
    }
    
    /// <summary>
    /// Blog categories
    /// </summary>
    public enum BlogCategory
    {
        News,
        Tutorial,
        CaseStudy,
        Technology,
        Materials,
        Industry,
        Tips,
        Announcement
    }
}