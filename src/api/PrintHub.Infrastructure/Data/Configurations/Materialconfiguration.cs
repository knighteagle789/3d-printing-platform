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

            builder.Property(m => m.Type)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(m => m.Color)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(m => m.Finish)
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(m => m.Grade)
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(m => m.Description)
                .HasMaxLength(1000);

            builder.Property(m => m.Brand)
                .HasMaxLength(100);

            builder.Property(m => m.PricePerGram)
                .IsRequired()
                .HasPrecision(18, 4);

            builder.Property(m => m.StockGrams)
                .IsRequired()
                .HasPrecision(18, 2);

            builder.Property(m => m.LowStockThresholdGrams)
                .HasPrecision(18, 2);

            builder.Property(m => m.Notes)
                .HasMaxLength(1000);

            builder.Property(m => m.PrintSettings)
                .HasColumnType("jsonb");

            builder.Property(m => m.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(m => m.Type);
            builder.HasIndex(m => m.IsActive);
            builder.HasIndex(m => new { m.Type, m.Color }); // common filter combo
            builder.HasIndex(m => m.PrintingTechnologyId);

            // Relationship: Material -> PrintingTechnology (many-to-one)
            builder.HasOne(m => m.PrintingTechnology)
                   .WithMany()
                   .HasForeignKey(m => m.PrintingTechnologyId)
                   .OnDelete(DeleteBehavior.SetNull);
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
}