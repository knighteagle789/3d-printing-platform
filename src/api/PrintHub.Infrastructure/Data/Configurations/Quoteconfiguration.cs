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
}