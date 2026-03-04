using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data
{
    /// <summary>
    /// Main database context for PrintHub
    /// </summary>
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // User Management
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<UserRole> UserRoles { get; set; } = null!;

        // Materials and Technologies
        public DbSet<Material> Materials { get; set; } = null!;
        public DbSet<PrintingTechnology> PrintingTechnologies { get; set; } = null!;

        // Orders
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<OrderItem> OrderItems { get; set; } = null!;
        public DbSet<OrderStatusHistory> OrderStatusHistory { get; set; } = null!;

        // Quotes
        public DbSet<QuoteRequest> QuoteRequests { get; set; } = null!;
        public DbSet<QuoteResponse> QuoteResponses { get; set; } = null!;

        // Payments
        public DbSet<Payment> Payments { get; set; }

        // Files
        public DbSet<UploadedFile> UploadedFiles { get; set; } = null!;
        public DbSet<FileAnalysis> FileAnalyses { get; set; } = null!;

        // Content
        public DbSet<PortfolioItem> PortfolioItems { get; set; } = null!;
        public DbSet<BlogPost> BlogPosts { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply all entity configurations from this assembly
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

            // Additional global configurations
            ConfigureGlobalProperties(modelBuilder);
        }

        /// <summary>
        /// Configure global properties and conventions
        /// </summary>
        private void ConfigureGlobalProperties(ModelBuilder modelBuilder)
        {
            // Set precision for all decimal properties
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if ((property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                        && property.GetPrecision() == null)
                    {
                        property.SetPrecision(18);
                        property.SetScale(2);
                    }
                }
            }

            // Set default string lengths
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(string) 
                        && property.GetMaxLength() == null
                        && property.GetColumnType() == null)
                    {
                        property.SetMaxLength(500);
                    }
                }
            }
        }

        /// <summary>
        /// Override SaveChanges to automatically set timestamps
        /// </summary>
        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }

        /// <summary>
        /// Override SaveChangesAsync to automatically set timestamps
        /// </summary>
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateTimestamps();
            return base.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Automatically set CreatedAt and UpdatedAt timestamps
        /// </summary>
        private void UpdateTimestamps()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added)
                {
                    if (entry.Metadata.FindProperty("CreatedAt") != null && entry.Property("CreatedAt").CurrentValue == null)
                    {
                        entry.Property("CreatedAt").CurrentValue = DateTime.UtcNow;
                    }
                }

                if (entry.State == EntityState.Modified)
                {
                    if (entry.Metadata.FindProperty("UpdatedAt") != null)
                    {
                        entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
                    }
                }
            }
        }
    }
}