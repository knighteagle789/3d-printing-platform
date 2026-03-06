using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data.Configurations
{
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
            builder.Property(p => p.Tags).HasColumnType("text[]");
            builder.Property(p => p.Category).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(p => p.ProjectDetails).HasColumnType("jsonb");
            builder.Property(p => p.ModelFileUrl).HasMaxLength(1000);
            builder.Property(p => p.TimelapseVideoUrl).HasMaxLength(1000);
            builder.Property(p => p.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(p => p.IsFeatured);
            builder.HasIndex(p => p.Category);
            builder.HasIndex(p => p.IsPublished);
            builder.HasIndex(p => p.Tags)
                .HasMethod("GIN");

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
            builder.Property(b => b.Content).IsRequired().HasColumnType("text");
            builder.Property(b => b.FeaturedImageUrl).HasMaxLength(1000);
            builder.Property(b => b.Category).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(b => b.Tags).HasColumnType("text[]");
            builder.Property(b => b.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(b => b.Slug).IsUnique();
            builder.HasIndex(b => b.AuthorId);
            builder.HasIndex(b => b.Category);
            builder.HasIndex(b => b.IsPublished);
            builder.HasIndex(b => b.PublishedAt);
            builder.HasIndex(b => b.Tags)
                .HasMethod("GIN");

            builder.HasOne(b => b.Author)
                .WithMany()
                .HasForeignKey(b => b.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}