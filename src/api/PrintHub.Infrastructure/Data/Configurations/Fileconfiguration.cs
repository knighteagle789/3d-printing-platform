using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data.Configurations
{
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
}