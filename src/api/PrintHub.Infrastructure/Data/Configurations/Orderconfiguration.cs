using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework configuration for Order entity
    /// </summary>
    public class OrderConfiguration : IEntityTypeConfiguration<Order>
    {
        public void Configure(EntityTypeBuilder<Order> builder)
        {
            builder.ToTable("Orders");

            builder.HasKey(o => o.Id);

            builder.Property(o => o.OrderNumber)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(o => o.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(o => o.TotalPrice)
                .IsRequired()
                .HasPrecision(18, 2);

            builder.Property(o => o.ShippingCost)
                .HasPrecision(18, 2);

            builder.Property(o => o.Tax)
                .HasPrecision(18, 2);

            builder.Property(o => o.Notes)
                .HasMaxLength(2000);

            builder.Property(o => o.ShippingAddress)
                .HasMaxLength(1000);

            builder.Property(o => o.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(o => o.OrderNumber)
                .IsUnique();

            builder.HasIndex(o => o.UserId);

            builder.HasIndex(o => o.Status);

            builder.HasIndex(o => o.CreatedAt);

            builder.HasIndex(o => o.QuoteRequestId);

            // Navigation configurations
            builder.HasMany(o => o.Items)
                .WithOne(i => i.Order)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(o => o.StatusHistory)
                .WithOne(h => h.Order)
                .HasForeignKey(h => h.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Link back to the source quote request, if this order came from a quote flow.
            // WithMany() because QuoteRequest already owns its own OrderId FK on the other side —
            // these are two independent FK columns, not a HasOne/WithOne pair, which avoids
            // EF shadow-property conflicts between the two configurations.
            builder.HasOne(o => o.SourceQuote)
                .WithMany()
                .HasForeignKey(o => o.QuoteRequestId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }

    /// <summary>
    /// Entity Framework configuration for OrderItem entity
    /// </summary>
    public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
    {
        public void Configure(EntityTypeBuilder<OrderItem> builder)
        {
            builder.ToTable("OrderItems");

            builder.HasKey(i => i.Id);

            builder.Property(i => i.Quantity)
                .IsRequired();

            builder.Property(i => i.UnitPrice)
                .IsRequired()
                .HasPrecision(18, 2);

            builder.Property(i => i.TotalPrice)
                .IsRequired()
                .HasPrecision(18, 2);

            builder.Property(i => i.Color)
                .HasMaxLength(100);

            builder.Property(i => i.SpecialInstructions)
                .HasMaxLength(1000);

            builder.Property(i => i.EstimatedWeight)
                .HasPrecision(18, 2);

            builder.Property(i => i.EstimatedPrintTime)
                .HasPrecision(18, 2);

            builder.Property(i => i.Quality)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(i => i.Infill)
                .HasPrecision(5, 2);

            builder.Property(i => i.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(i => i.OrderId);

            builder.HasIndex(i => i.MaterialId);

            builder.HasIndex(i => i.FileId);

            // Navigation configurations
            builder.HasOne(i => i.Material)
                .WithMany(m => m.OrderItems)
                .HasForeignKey(i => i.MaterialId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(i => i.File)
                .WithMany()
                .HasForeignKey(i => i.FileId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    /// <summary>
    /// Entity Framework configuration for OrderStatusHistory entity
    /// </summary>
    public class OrderStatusHistoryConfiguration : IEntityTypeConfiguration<OrderStatusHistory>
    {
        public void Configure(EntityTypeBuilder<OrderStatusHistory> builder)
        {
            builder.ToTable("OrderStatusHistory");

            builder.HasKey(h => h.Id);

            builder.Property(h => h.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(h => h.Notes)
                .HasMaxLength(1000);

            builder.Property(h => h.ChangedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(h => h.OrderId);

            builder.HasIndex(h => h.ChangedAt);

            // Navigation configurations
            builder.HasOne(h => h.ChangedBy)
                .WithMany()
                .HasForeignKey(h => h.ChangedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}