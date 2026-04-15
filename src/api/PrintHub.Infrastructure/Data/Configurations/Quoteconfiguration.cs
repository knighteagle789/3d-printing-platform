using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data.Configurations
{
    public class QuoteRequestConfiguration : IEntityTypeConfiguration<QuoteRequest>
    {
        public void Configure(EntityTypeBuilder<QuoteRequest> builder)
        {
            builder.ToTable("QuoteRequests");
            builder.HasKey(q => q.Id);

            builder.Property(q => q.RequestNumber).IsRequired().HasMaxLength(50);
            builder.Property(q => q.Status).IsRequired().HasConversion<string>().HasMaxLength(50);
            builder.Property(q => q.SpecialRequirements).HasMaxLength(2000);
            builder.Property(q => q.Notes).HasMaxLength(2000);
            builder.Property(q => q.BudgetMin).HasPrecision(18, 2);
            builder.Property(q => q.BudgetMax).HasPrecision(18, 2);
            builder.Property(q => q.SetupFee).HasPrecision(18, 2);
            builder.Property(q => q.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(q => q.RequestNumber).IsUnique();
            builder.HasIndex(q => q.UserId);
            builder.HasIndex(q => q.Status);
            builder.HasIndex(q => q.CreatedAt);
            builder.HasIndex(q => q.OrderId);

            builder.HasMany(q => q.Files)
                .WithOne(f => f.QuoteRequest)
                .HasForeignKey(f => f.QuoteRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(q => q.Responses)
                .WithOne(r => r.QuoteRequest)
                .HasForeignKey(r => r.QuoteRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(q => q.Order)
                .WithMany()
                .HasForeignKey(q => q.OrderId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }

    public class QuoteRequestFileConfiguration : IEntityTypeConfiguration<QuoteRequestFile>
    {
        public void Configure(EntityTypeBuilder<QuoteRequestFile> builder)
        {
            builder.ToTable("QuoteRequestFiles");
            builder.HasKey(f => f.Id);

            builder.Property(f => f.Quantity).IsRequired();
            builder.Property(f => f.Color).HasMaxLength(100);
            builder.Property(f => f.DimensionX).HasPrecision(10, 3);
            builder.Property(f => f.DimensionY).HasPrecision(10, 3);
            builder.Property(f => f.DimensionZ).HasPrecision(10, 3);
            builder.Property(f => f.EstimatedWeightGrams).HasPrecision(10, 4);
            builder.Property(f => f.EstimatedPrintTimeHours).HasPrecision(10, 4);
            builder.Property(f => f.MaterialCost).HasPrecision(18, 2);
            builder.Property(f => f.MachineCost).HasPrecision(18, 2);
            builder.Property(f => f.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(f => f.QuoteRequestId);
            builder.HasIndex(f => f.FileId);

            builder.HasOne(f => f.File)
                .WithMany()
                .HasForeignKey(f => f.FileId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(f => f.Material)
                .WithMany()
                .HasForeignKey(f => f.MaterialId)
                .OnDelete(DeleteBehavior.SetNull);
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
}
