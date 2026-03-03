using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data
{
    /// <summary>
    /// Seeds the database with initial data for development and testing
    /// </summary>
    public class DatabaseSeeder
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DatabaseSeeder> _logger;

        public DatabaseSeeder(ApplicationDbContext context, ILogger<DatabaseSeeder> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task SeedAsync()
        {
            try
            {
                // Ensure database is created
                await _context.Database.EnsureCreatedAsync();

                // Seed in dependency order - each group saved before next begins
                if (!await _context.Users.AnyAsync())
                {
                    _logger.LogInformation("Seeding users...");
                    await SeedUsersAsync();
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Users seeded successfully.");
                }

                if (!await _context.Materials.AnyAsync())
                {
                    _logger.LogInformation("Seeding materials...");
                    await SeedMaterialsAsync();
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Materials seeded successfully.");
                }

                if (!await _context.PrintingTechnologies.AnyAsync())
                {
                    _logger.LogInformation("Seeding printing technologies...");
                    await SeedPrintingTechnologiesAsync();
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Printing technologies seeded successfully.");
                }

                if (!await _context.PortfolioItems.AnyAsync())
                {
                    _logger.LogInformation("Seeding portfolio items...");
                    await SeedPortfolioItemsAsync();
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Portfolio items seeded successfully.");
                }

                if (!await _context.BlogPosts.AnyAsync())
                {
                    _logger.LogInformation("Seeding blog posts...");
                    await SeedBlogPostsAsync();
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Blog posts seeded successfully.");
                }

                if (!await _context.Orders.AnyAsync())
                {
                    _logger.LogInformation("Seeding orders...");
                    await SeedOrdersAsync();
                    _logger.LogInformation("Orders seeded successfully.");
                }

                _logger.LogInformation("Database seeding completed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while seeding the database.");
                throw;
            }
        }

        // ─── Users ────────────────────────────────────────────────────────────

        private async Task SeedUsersAsync()
        {
            var users = new List<User>
            {
                new User
                {
                    Id = new Guid("11111111-1111-1111-1111-111111111111"),
                    Email = "admin@printhub.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                    FirstName = "Sarah",
                    LastName = "Johnson",
                    IsActive = true,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-6)
                },
                new User
                {
                    Id = new Guid("22222222-2222-2222-2222-222222222222"),
                    Email = "staff@printhub.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff123!"),
                    FirstName = "Michael",
                    LastName = "Chen",
                    IsActive = true,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-4)
                },
                new User
                {
                    Id = new Guid("33333333-3333-3333-3333-333333333333"),
                    Email = "customer1@example.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer123!"),
                    FirstName = "Emily",
                    LastName = "Rodriguez",
                    PhoneNumber = "555-0101",
                    CompanyName = "Rodriguez Robotics",
                    IsActive = true,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-3)
                },
                new User
                {
                    Id = new Guid("44444444-4444-4444-4444-444444444444"),
                    Email = "customer2@example.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer123!"),
                    FirstName = "James",
                    LastName = "Wilson",
                    IsActive = true,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-2)
                }
            };

            await _context.Users.AddRangeAsync(users);

            var roles = new List<UserRole>
            {
                new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = new Guid("11111111-1111-1111-1111-111111111111"),
                    Role = Role.Admin,
                    AssignedAt = DateTime.UtcNow.AddMonths(-6)
                },
                new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = new Guid("22222222-2222-2222-2222-222222222222"),
                    Role = Role.Staff,
                    AssignedAt = DateTime.UtcNow.AddMonths(-4)
                },
                new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = new Guid("33333333-3333-3333-3333-333333333333"),
                    Role = Role.Customer,
                    AssignedAt = DateTime.UtcNow.AddMonths(-3)
                },
                new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = new Guid("44444444-4444-4444-4444-444444444444"),
                    Role = Role.Customer,
                    AssignedAt = DateTime.UtcNow.AddMonths(-2)
                }
            };

            await _context.UserRoles.AddRangeAsync(roles);
        }

        // ─── Materials ────────────────────────────────────────────────────────

        private async Task SeedMaterialsAsync()
        {
            var materials = new List<Material>
            {
                new Material
                {
                    Id = new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                    Name = "PLA (Standard)",
                    Brand = "Hatchbox",
                    Description = "Biodegradable, easy to print, great for beginners. Low warping.",
                    Type = MaterialType.PLA,
                    PricePerGram = 0.15m,
                    AvailableColors = new[] { "White", "Black", "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Gray", "Natural" },
                    Properties = @"{""strength"":""Medium"",""flexibility"":""Low"",""maxTemp"":""60°C"",""biodegradable"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-6)
                },
                new Material
                {
                    Id = new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                    Name = "ABS (High Strength)",
                    Brand = "Hatchbox",
                    Description = "Strong, durable, heat resistant. Ideal for functional parts.",
                    Type = MaterialType.ABS,
                    PricePerGram = 0.18m,
                    AvailableColors = new[] { "White", "Black", "Red", "Blue", "Gray" },
                    Properties = @"{""strength"":""High"",""flexibility"":""Low"",""maxTemp"":""98°C"",""biodegradable"":false}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-6)
                },
                new Material
                {
                    Id = new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                    Name = "PETG (Engineering Grade)",
                    Brand = "Polymaker",
                    Description = "Strong, flexible, chemical resistant. Best of PLA and ABS.",
                    Type = MaterialType.PETG,
                    PricePerGram = 0.20m,
                    AvailableColors = new[] { "Clear", "Black", "White", "Red", "Blue", "Orange" },
                    Properties = @"{""strength"":""High"",""flexibility"":""Medium"",""maxTemp"":""80°C"",""foodSafe"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-5)
                },
                new Material
                {
                    Id = new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                    Name = "TPU (Flexible)",
                    Brand = "Polymaker",
                    Description = "Rubber-like flexibility, excellent durability and impact resistance.",
                    Type = MaterialType.TPU,
                    PricePerGram = 0.28m,
                    AvailableColors = new[] { "Black", "White", "Red", "Blue", "Clear" },
                    Properties = @"{""strength"":""Medium"",""flexibility"":""Very High"",""maxTemp"":""60°C"",""shore"":""95A""}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-5)
                },
                new Material
                {
                    Id = new Guid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
                    Name = "Nylon (PA12)",
                    Brand = "Prusament",
                    Description = "Extremely strong and durable. Excellent for functional parts.",
                    Type = MaterialType.Nylon,
                    PricePerGram = 0.35m,
                    AvailableColors = new[] { "Natural", "Black", "White" },
                    Properties = @"{""strength"":""Very High"",""flexibility"":""Medium"",""maxTemp"":""120°C"",""wearResistant"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-4)
                },
                new Material
                {
                    Id = new Guid("ffffffff-ffff-ffff-ffff-ffffffffffff"),
                    Name = "Standard Resin",
                    Brand = "Elegoo",
                    Description = "High detail SLA resin for smooth surface finish.",
                    Type = MaterialType.Resin,
                    PricePerGram = 0.40m,
                    AvailableColors = new[] { "White", "Black", "Gray", "Clear" },
                    Properties = @"{""strength"":""Medium"",""detail"":""Very High"",""finish"":""Smooth"",""uv"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-4)
                },
                new Material
                {
                    Id = Guid.NewGuid(),
                    Name = "PLA (Legacy)",
                    Brand = "Hatchbox",
                    Description = "Discontinued standard PLA. Replaced by PLA (Standard).",
                    Type = MaterialType.PLA,
                    PricePerGram = 0.12m,
                    AvailableColors = new[] { "White", "Black" },
                    IsActive = false,   // Discontinued - tests IsActive filtering!
                    CreatedAt = DateTime.UtcNow.AddMonths(-12)
                }
            };

            await _context.Materials.AddRangeAsync(materials);
        }

        // ─── Printing Technologies ────────────────────────────────────────────

        private async Task SeedPrintingTechnologiesAsync()
        {
            var technologies = new List<PrintingTechnology>
            {
                new PrintingTechnology
                {
                    Id = Guid.NewGuid(),
                    Name = "FDM - Standard Resolution",
                    Description = "Fused Deposition Modeling with 0.2mm layer height",
                    Type = TechnologyType.FDM,
                    MaxDimensions = "300x300x400",
                    LayerHeightRange = "0.1-0.4",
                    TypicalSpeed = 60,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new PrintingTechnology
                {
                    Id = Guid.NewGuid(),
                    Name = "FDM - High Resolution",
                    Description = "FDM with 0.1mm layer height for detailed prints",
                    Type = TechnologyType.FDM,
                    MaxDimensions = "300x300x400",
                    LayerHeightRange = "0.05-0.2",
                    TypicalSpeed = 40,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new PrintingTechnology
                {
                    Id = Guid.NewGuid(),
                    Name = "SLA - Ultra Detail",
                    Description = "Stereolithography for ultra-high detail and smooth finish",
                    Type = TechnologyType.SLA,
                    MaxDimensions = "145x145x175",
                    LayerHeightRange = "0.025-0.1",
                    TypicalSpeed = 30,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            };

            await _context.PrintingTechnologies.AddRangeAsync(technologies);
        }

        // ─── Portfolio Items ──────────────────────────────────────────────────

        private async Task SeedPortfolioItemsAsync()
        {
            var portfolioItems = new List<PortfolioItem>
            {
                new PortfolioItem
                {
                    Id = Guid.NewGuid(),
                    Title = "Custom Drone Frame",
                    Description = "Lightweight carbon fiber composite frame for racing drone",
                    DetailedDescription = "Custom-designed racing drone frame optimized for strength-to-weight ratio. Features integrated cable management and camera mount.",
                    ImageUrl = "/portfolio/drone-frame.jpg",
                    Tags = new[] { "drone", "racing", "carbon", "lightweight" },
                    Category = PortfolioCategory.Prototyping,
                    MaterialId = new Guid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"), // Nylon
                    IsFeatured = true,
                    DisplayOrder = 1,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-4)
                },
                new PortfolioItem
                {
                    Id = Guid.NewGuid(),
                    Title = "Architectural Scale Model",
                    Description = "1:100 scale model of modern office building",
                    DetailedDescription = "Highly detailed architectural model with removable floors and transparent windows. Printed in white resin for smooth finish.",
                    ImageUrl = "/portfolio/arch-model.jpg",
                    Tags = new[] { "architecture", "model", "resin", "detailed" },
                    Category = PortfolioCategory.Architecture,
                    MaterialId = new Guid("ffffffff-ffff-ffff-ffff-ffffffffffff"), // Resin
                    IsFeatured = true,
                    DisplayOrder = 2,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-3)
                },
                new PortfolioItem
                {
                    Id = Guid.NewGuid(),
                    Title = "Medical Training Model",
                    Description = "Anatomically accurate heart model for medical education",
                    DetailedDescription = "Multi-part heart model with removable chambers. Printed in flexible TPU for realistic feel. Used by medical schools.",
                    ImageUrl = "/portfolio/heart-model.jpg",
                    Tags = new[] { "medical", "education", "anatomy", "flexible" },
                    Category = PortfolioCategory.Medical,
                    MaterialId = new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"), // TPU
                    IsFeatured = true,
                    DisplayOrder = 3,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-2)
                },
                new PortfolioItem
                {
                    Id = Guid.NewGuid(),
                    Title = "Work In Progress",
                    Description = "Draft item not yet ready for publishing.",
                    ImageUrl = "/portfolio/draft.jpg",
                    Tags = new[] { "draft" },
                    Category = PortfolioCategory.Other,
                    IsFeatured = false,
                    DisplayOrder = 99,
                    IsPublished = false,    // Tests IsPublished filtering!
                    CreatedAt = DateTime.UtcNow
                }
            };

            await _context.PortfolioItems.AddRangeAsync(portfolioItems);
        }

        // ─── Blog Posts ───────────────────────────────────────────────────────

        private async Task SeedBlogPostsAsync()
        {
            var authorId = new Guid("22222222-2222-2222-2222-222222222222"); // Michael (Staff)

            var blogPosts = new List<BlogPost>
            {
                new BlogPost
                {
                    Id = Guid.NewGuid(),
                    AuthorId = authorId,
                    Title = "PLA vs PETG: Which Filament Should You Choose?",
                    Slug = "pla-vs-petg-filament-guide",
                    Summary = "Confused about filaments? We compare PLA and PETG to help " +
                              "you choose the right material for your project.",
                    Content = "# PLA vs PETG\n\nFull article content here...",
                    Category = BlogCategory.Materials,
                    Tags = new[] { "pla", "petg", "filament", "materials", "beginners" },
                    IsPublished = true,
                    PublishedAt = DateTime.UtcNow.AddDays(-30),
                    ViewCount = 247,
                    CreatedAt = DateTime.UtcNow.AddDays(-32)
                },
                new BlogPost
                {
                    Id = Guid.NewGuid(),
                    AuthorId = authorId,
                    Title = "5 Tips for Perfect 3D Prints Every Time",
                    Slug = "5-tips-perfect-3d-prints",
                    Summary = "Master these five techniques and dramatically improve " +
                              "your print success rate.",
                    Content = "# 5 Tips for Perfect Prints\n\nFull content here...",
                    Category = BlogCategory.Tips,
                    Tags = new[] { "tips", "beginners", "troubleshooting", "quality" },
                    IsPublished = true,
                    PublishedAt = DateTime.UtcNow.AddDays(-15),
                    ViewCount = 183,
                    CreatedAt = DateTime.UtcNow.AddDays(-17)
                },
                new BlogPost
                {
                    Id = Guid.NewGuid(),
                    AuthorId = authorId,
                    Title = "How We Printed a Custom Prosthetic Hand",
                    Slug = "custom-prosthetic-hand-case-study",
                    Summary = "A detailed look at how we approached this challenging " +
                              "medical printing project.",
                    Content = "# Prosthetic Hand Case Study\n\nFull content here...",
                    Category = BlogCategory.CaseStudy,
                    Tags = new[] { "medical", "prosthetic", "case-study", "nylon" },
                    IsPublished = true,
                    PublishedAt = DateTime.UtcNow.AddDays(-7),
                    ViewCount = 89,
                    CreatedAt = DateTime.UtcNow.AddDays(-8)
                },
                new BlogPost
                {
                    Id = Guid.NewGuid(),
                    AuthorId = authorId,
                    Title = "Spring Sale - 20% Off All Orders",
                    Slug = "spring-sale-2026",
                    Summary = "Celebrate spring with 20% off all 3D printing orders!",
                    Content = "# Spring Sale\n\nFull announcement here...",
                    Category = BlogCategory.Announcement,
                    Tags = new[] { "sale", "promotion", "discount" },
                    IsPublished = false,    // Draft - tests IsPublished filtering!
                    PublishedAt = null,
                    ViewCount = 0,
                    CreatedAt = DateTime.UtcNow
                }
            };

            await _context.BlogPosts.AddRangeAsync(blogPosts);
        }

        // ─── Orders ───────────────────────────────────────────────────────────

        private async Task SeedOrdersAsync()
        {
            var customer1Id = new Guid("33333333-3333-3333-3333-333333333333");
            var customer2Id = new Guid("44444444-4444-4444-4444-444444444444");
            var staffId     = new Guid("22222222-2222-2222-2222-222222222222");
            var plaId       = new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            var petgId      = new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc");

            // ── Order 1: Completed order ──────────────────────────────────────
            var order1Id = Guid.NewGuid();
            var order1 = new Order
            {
                Id = order1Id,
                UserId = customer1Id,
                OrderNumber = "ORD-20260101-001",
                Status = OrderStatus.Completed,
                TotalPrice = 89.50m,
                ShippingCost = 12.00m,
                Tax = 8.15m,
                ShippingAddress = "123 Main St, Denver, CO 80201",
                CreatedAt = DateTime.UtcNow.AddDays(-45),
                UpdatedAt = DateTime.UtcNow.AddDays(-38),
                ShippedAt = DateTime.UtcNow.AddDays(-39),
                CompletedAt = DateTime.UtcNow.AddDays(-38)
            };

            // ── Order 2: Currently printing ───────────────────────────────────
            var order2Id = Guid.NewGuid();
            var order2 = new Order
            {
                Id = order2Id,
                UserId = customer2Id,
                OrderNumber = "ORD-20260201-001",
                Status = OrderStatus.Printing,
                TotalPrice = 145.00m,
                ShippingCost = 15.00m,
                ShippingAddress = "456 Oak Ave, Boulder, CO 80302",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            };

            await _context.Orders.AddRangeAsync(order1, order2);
            await _context.SaveChangesAsync();  // Orders must exist before items!

            // Add these dummy files before creating OrderItems
            var dummyFiles = new List<UploadedFile>
            {
                new()
                {
                    Id = Guid.Parse("aaaa1111-1111-1111-1111-111111111111"),
                    UserId = Guid.Parse("33333333-3333-3333-3333-333333333333"), // Emily
                    OriginalFileName = "drone-frame-v2.stl",
                    StorageUrl = "/uploads/placeholder/drone-frame-v2.stl",
                    BlobName = "placeholder_drone-frame-v2.stl",
                    FileSizeBytes = 2_500_000,
                    ContentType = "application/sla",
                    FileType = FileType.STL,
                    UploadedAt = DateTime.UtcNow.AddMonths(-2)
                },
                new()
                {
                    Id = Guid.Parse("aaaa2222-2222-2222-2222-222222222222"),
                    UserId = Guid.Parse("44444444-4444-4444-4444-444444444444"), // James
                    OriginalFileName = "phone-case-custom.stl",
                    StorageUrl = "/uploads/placeholder/phone-case-custom.stl",
                    BlobName = "placeholder_phone-case-custom.stl",
                    FileSizeBytes = 1_200_000,
                    ContentType = "application/sla",
                    FileType = FileType.STL,
                    UploadedAt = DateTime.UtcNow.AddMonths(-1)
                }
            };

            await _context.UploadedFiles.AddRangeAsync(dummyFiles);
            await _context.SaveChangesAsync();

            // ── Order Items ───────────────────────────────────────────────────
            var orderItems = new List<OrderItem>
            {
                new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1Id,
                    MaterialId = plaId,
                    Quantity = 2,
                    UnitPrice = 34.75m,
                    TotalPrice = 69.50m,
                    Quality = PrintQuality.Standard,
                    Infill = 20.00m,
                    FileId = Guid.Parse("aaaa1111-1111-1111-1111-111111111111"), // drone-frame-v2.stl
                    Color = "Black",
                    EstimatedWeight = 45.5m,
                    EstimatedPrintTime = 4.5m,
                    CreatedAt = DateTime.UtcNow.AddDays(-45)
                },
                new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = order2Id,
                    MaterialId = petgId,
                    Quantity = 1,
                    UnitPrice = 130.00m,
                    TotalPrice = 130.00m,
                    Quality = PrintQuality.High,
                    Infill = 40.00m,
                    Color = "Clear",
                    EstimatedWeight = 180.5m,
                    EstimatedPrintTime = 12.5m,
                    SpecialInstructions = "No visible layer lines on exterior surfaces",
                    FileId = Guid.Parse("aaaa2222-2222-2222-2222-222222222222"), // phone-case-custom.stl
                    CreatedAt = DateTime.UtcNow.AddDays(-5)
                }
            };

            await _context.OrderItems.AddRangeAsync(orderItems);
            await _context.SaveChangesAsync();  // Items saved before history!

            // ── Status History ─────────────────────────────────────────────────
            var statusHistory = new List<OrderStatusHistory>
            {
                // Order 1 - full journey
                new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1Id,
                    Status = OrderStatus.Submitted,
                    ChangedByUserId = customer1Id,
                    Notes = "Order submitted by customer",
                    ChangedAt = DateTime.UtcNow.AddDays(-45)
                },
                new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1Id,
                    Status = OrderStatus.Approved,
                    ChangedByUserId = staffId,
                    Notes = "Approved - files look good, dimensions within limits",
                    ChangedAt = DateTime.UtcNow.AddDays(-44)
                },
                new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1Id,
                    Status = OrderStatus.Printing,
                    ChangedByUserId = staffId,
                    Notes = "Printing started on Printer #2 (Ender 5 Pro)",
                    ChangedAt = DateTime.UtcNow.AddDays(-43)
                },
                new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1Id,
                    Status = OrderStatus.Shipped,
                    ChangedByUserId = staffId,
                    Notes = "Shipped via FedEx. Tracking: 123456789012",
                    ChangedAt = DateTime.UtcNow.AddDays(-39)
                },
                new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1Id,
                    Status = OrderStatus.Completed,
                    ChangedByUserId = customer1Id,
                    Notes = "Customer confirmed receipt. Excellent quality!",
                    ChangedAt = DateTime.UtcNow.AddDays(-38)
                },

                // Order 2 - in progress
                new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = order2Id,
                    Status = OrderStatus.Submitted,
                    ChangedByUserId = customer2Id,
                    ChangedAt = DateTime.UtcNow.AddDays(-5)
                },
                new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = order2Id,
                    Status = OrderStatus.Printing,
                    ChangedByUserId = staffId,
                    Notes = "Printing on Printer #3 (Ender 5 Pro). Est. 12.5 hours.",
                    ChangedAt = DateTime.UtcNow.AddDays(-2)
                }
            };

            await _context.OrderStatusHistory.AddRangeAsync(statusHistory);
            await _context.SaveChangesAsync();
        }
    }
}