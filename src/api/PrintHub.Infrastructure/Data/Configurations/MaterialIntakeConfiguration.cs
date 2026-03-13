using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data.Configurations
{
    public class MaterialIntakeConfiguration : IEntityTypeConfiguration<MaterialIntake>
    {
        public void Configure(EntityTypeBuilder<MaterialIntake> builder)
        {
            builder.ToTable("MaterialIntakes");
            builder.HasKey(i => i.Id);

            builder.Property(i => i.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(30);

            builder.Property(i => i.PhotoBlobName)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(i => i.PhotoUrl)
                .IsRequired()
                .HasMaxLength(2000);

            builder.Property(i => i.SourceType)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(30);

            builder.Property(i => i.UploadNotes)
                .HasMaxLength(1000);

            builder.Property(i => i.LastExtractionError)
                .HasMaxLength(2000);

            builder.Property(i => i.DraftBrand)
                .HasMaxLength(100);

            builder.Property(i => i.DraftMaterialType)
                .HasMaxLength(50);

            builder.Property(i => i.DraftColor)
                .HasMaxLength(100);

            builder.Property(i => i.DraftSpoolWeightGrams)
                .HasPrecision(18, 2);

            builder.Property(i => i.DraftPrintSettingsHints)
                .HasColumnType("jsonb");

            builder.Property(i => i.DraftBatchOrLot)
                .HasMaxLength(200);

            builder.Property(i => i.ConfidenceMap)
                .HasColumnType("jsonb");

            builder.Property(i => i.ReviewerCorrections)
                .HasColumnType("jsonb");

            builder.Property(i => i.RejectionReason)
                .HasMaxLength(1000);

            builder.Property(i => i.ApprovalOutcome)
                .HasConversion<string>()
                .HasMaxLength(30);

            builder.Property(i => i.CreatedAtUtc)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Relationships
            builder.HasOne(i => i.UploadedBy)
                .WithMany()
                .HasForeignKey(i => i.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(i => i.ActionedBy)
                .WithMany()
                .HasForeignKey(i => i.ActionedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(i => i.ApprovedMaterial)
                .WithMany()
                .HasForeignKey(i => i.ApprovedMaterialId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasMany(i => i.Events)
                .WithOne(e => e.Intake)
                .HasForeignKey(e => e.IntakeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(i => i.Status);
            builder.HasIndex(i => i.UploadedByUserId);
            builder.HasIndex(i => i.CreatedAtUtc);
        }
    }

    public class IntakeEventConfiguration : IEntityTypeConfiguration<IntakeEvent>
    {
        public void Configure(EntityTypeBuilder<IntakeEvent> builder)
        {
            builder.ToTable("IntakeEvents");
            builder.HasKey(e => e.Id);

            builder.Property(e => e.EventType)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(e => e.ToStatus)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(30);

            builder.Property(e => e.Details)
                .HasColumnType("jsonb");

            builder.Property(e => e.OccurredAtUtc)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.HasIndex(e => e.IntakeId);
            builder.HasIndex(e => e.OccurredAtUtc);
        }
    }
}
