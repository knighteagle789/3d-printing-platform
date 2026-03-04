using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
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
            builder.Property(m => m.Brand).HasMaxLength(100);
            builder.Property(m => m.PricePerGram).IsRequired().HasPrecision(18, 4);
            builder.Property(m => m.AvailableColors)
                .HasColumnType("text[]")
                .Metadata.SetValueComparer(new ValueComparer<string[]>(
                    (c1, c2) => c1 != null && c2 != null && c1.SequenceEqual(c2),
                    c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                    c => c.ToArray()
                ));
            builder.Property(m => m.Properties).HasColumnType("jsonb");
            builder.Property(m => m.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(m => m.Name);
            builder.HasIndex(m => m.Type);
            builder.HasIndex(m => m.IsActive);

            // Relationship: Material -> PrintingTechnology (many-to-one)
            builder.HasOne(m => m.PrintingTechnology)
                   .WithMany()
                   .HasForeignKey(m => m.PrintingTechnologyId)
                   .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(m => m.PrintingTechnologyId);
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