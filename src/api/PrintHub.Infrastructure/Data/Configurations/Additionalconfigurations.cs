using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data.Configurations
{
    public class MaterialConfiguration : IEntityTypeConfiguration<Material>
    {
        public void Configure(EntityTypeBuilder<Material> builder)
        {
            builder.ToTable("Materials");
            builder.HasKey(m => m.Id);

            builder.Property(m => m.Name).IsRequired().HasMaxLength(200);
            builder.Property(m => m.Description).IsRequired().HasMaxLength(1000);
            builder.Property(m => m.Type).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(m => m.PricePerGram).IsRequired().HasPrecision(18, 4);
            builder.Property(m => m.AvailableColors).HasMaxLength(1000);
            builder.Property(m => m.Properties).HasColumnType("jsonb");
            builder.Property(m => m.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(m => m.Name);
            builder.HasIndex(m => m.Type);
            builder.HasIndex(m => m.IsActive);
        }
    }

    public class PrintingTechnologyConfiguration : IEntityTypeConfiguration<PrintingTechnology>
    {
        public void Configure(EntityTypeBuilder<PrintingTechnology> builder)
        {
            builder.ToTable("PrintingTechnologies");
            builder.HasKey(t => t.Id);

            builder.Property(t => t.Name).IsRequired().HasMaxLength(200);
            builder.Property(t => t.Description).IsRequired().HasMaxLength(1000);
            builder.Property(t => t.Type).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(t => t.MaxDimensions).HasMaxLength(100);
            builder.Property(t => t.LayerHeightRange).HasMaxLength(50);
            builder.Property(t => t.TypicalSpeed).HasPrecision(18, 2);
            builder.Property(t => t.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(t => t.Type);
        }
    }

    public class QuoteRequestConfiguration : IEntityTypeConfiguration<QuoteRequest>
    {
        public void Configure(EntityTypeBuilder<QuoteRequest> builder)
        {
            builder.ToTable("QuoteRequests");
            builder.HasKey(q => q.Id);

            builder.Property(q => q.RequestNumber).IsRequired().HasMaxLength(50);
            builder.Property(q => q.Status).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(q => q.PreferredColor).HasMaxLength(100);
            builder.Property(q => q.SpecialRequirements).HasMaxLength(2000);
            builder.Property(q => q.Notes).HasMaxLength(2000);
            builder.Property(q => q.BudgetMin).HasPrecision(18, 2);
            builder.Property(q => q.BudgetMax).HasPrecision(18, 2);
            builder.Property(q => q.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(q => q.RequestNumber).IsUnique();
            builder.HasIndex(q => q.UserId);
            builder.HasIndex(q => q.Status);
            builder.HasIndex(q => q.CreatedAt);

            builder.HasOne(q => q.File)
                .WithMany()
                .HasForeignKey(q => q.FileId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(q => q.PreferredMaterial)
                .WithMany()
                .HasForeignKey(q => q.PreferredMaterialId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasMany(q => q.Responses)
                .WithOne(r => r.QuoteRequest)
                .HasForeignKey(r => r.QuoteRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class QuoteResponseConfiguration : IEntityTypeConfiguration<QuoteResponse>
    {
        public void Configure(EntityTypeBuilder<QuoteResponse> builder)
        {
            builder.ToTable("QuoteResponses");
            builder.HasKey(r => r.Id);

            builder.Property(r => r.Price).IsRequired().HasPrecision(18, 2);
            builder.Property(r => r.ShippingCost).HasPrecision(18, 2);
            builder.Property(r => r.RecommendedColor).HasMaxLength(100);
            builder.Property(r => r.TechnicalNotes).HasMaxLength(2000);
            builder.Property(r => r.AlternativeOptions).HasMaxLength(2000);
            builder.Property(r => r.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(r => r.QuoteRequestId);

            builder.HasOne(r => r.RecommendedMaterial)
                .WithMany()
                .HasForeignKey(r => r.RecommendedMaterialId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(r => r.CreatedBy)
                .WithMany()
                .HasForeignKey(r => r.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class UploadedFileConfiguration : IEntityTypeConfiguration<UploadedFile>
    {
        public void Configure(EntityTypeBuilder<UploadedFile> builder)
        {
            builder.ToTable("UploadedFiles");
            builder.HasKey(f => f.Id);

            builder.Property(f => f.OriginalFileName).IsRequired().HasMaxLength(500);
            builder.Property(f => f.StorageUrl).IsRequired().HasMaxLength(1000);
            builder.Property(f => f.BlobName).IsRequired().HasMaxLength(500);
            builder.Property(f => f.FileType).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(f => f.ContentType).HasMaxLength(200);
            builder.Property(f => f.Checksum).HasMaxLength(100);
            builder.Property(f => f.UploadedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(f => f.UserId);
            builder.HasIndex(f => f.UploadedAt);
            builder.HasIndex(f => f.BlobName);

            builder.HasOne(f => f.Analysis)
                .WithOne(a => a.File)
                .HasForeignKey<FileAnalysis>(a => a.FileId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class FileAnalysisConfiguration : IEntityTypeConfiguration<FileAnalysis>
    {
        public void Configure(EntityTypeBuilder<FileAnalysis> builder)
        {
            builder.ToTable("FileAnalyses");
            builder.HasKey(a => a.Id);

            builder.Property(a => a.VolumeInCubicMm).HasPrecision(18, 4);
            builder.Property(a => a.DimensionX).HasPrecision(18, 4);
            builder.Property(a => a.DimensionY).HasPrecision(18, 4);
            builder.Property(a => a.DimensionZ).HasPrecision(18, 4);
            builder.Property(a => a.SurfaceArea).HasPrecision(18, 4);
            builder.Property(a => a.EstimatedPrintTimeHours).HasPrecision(18, 2);
            builder.Property(a => a.EstimatedWeightGrams).HasPrecision(18, 2);
            builder.Property(a => a.Warnings).HasColumnType("jsonb");
            builder.Property(a => a.ThumbnailUrl).HasMaxLength(1000);
            builder.Property(a => a.AnalyzedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(a => a.FileId).IsUnique();
        }
    }

    public class PortfolioItemConfiguration : IEntityTypeConfiguration<PortfolioItem>
    {
        public void Configure(EntityTypeBuilder<PortfolioItem> builder)
        {
            builder.ToTable("PortfolioItems");
            builder.HasKey(p => p.Id);

            builder.Property(p => p.Title).IsRequired().HasMaxLength(300);
            builder.Property(p => p.Description).IsRequired().HasMaxLength(1000);
            builder.Property(p => p.DetailedDescription).HasMaxLength(5000);
            builder.Property(p => p.ImageUrl).IsRequired().HasMaxLength(1000);
            builder.Property(p => p.AdditionalImages).HasColumnType("jsonb");
            builder.Property(p => p.Tags).HasMaxLength(500);
            builder.Property(p => p.Category).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(p => p.ProjectDetails).HasColumnType("jsonb");
            builder.Property(p => p.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(p => p.IsFeatured);
            builder.HasIndex(p => p.Category);
            builder.HasIndex(p => p.IsPublished);

            builder.HasOne(p => p.Material)
                .WithMany()
                .HasForeignKey(p => p.MaterialId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }

    public class BlogPostConfiguration : IEntityTypeConfiguration<BlogPost>
    {
        public void Configure(EntityTypeBuilder<BlogPost> builder)
        {
            builder.ToTable("BlogPosts");
            builder.HasKey(b => b.Id);

            builder.Property(b => b.Title).IsRequired().HasMaxLength(300);
            builder.Property(b => b.Slug).IsRequired().HasMaxLength(350);
            builder.Property(b => b.Summary).IsRequired().HasMaxLength(500);
            builder.Property(b => b.Content).IsRequired();
            builder.Property(b => b.FeaturedImageUrl).HasMaxLength(1000);
            builder.Property(b => b.Category).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(b => b.Tags).HasMaxLength(500);
            builder.Property(b => b.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(b => b.Slug).IsUnique();
            builder.HasIndex(b => b.AuthorId);
            builder.HasIndex(b => b.Category);
            builder.HasIndex(b => b.IsPublished);
            builder.HasIndex(b => b.PublishedAt);

            builder.HasOne(b => b.Author)
                .WithMany()
                .HasForeignKey(b => b.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}