using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Entities;

namespace PrintHub.Infrastructure.Data
{
    /// <summary>
    /// Seeds the database with initial data
    /// </summary>
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Ensure database is created
            await context.Database.EnsureCreatedAsync();

            // Seed materials if none exist
            if (!await context.Materials.AnyAsync())
            {
                await SeedMaterialsAsync(context);
            }

            // Seed printing technologies if none exist
            if (!await context.PrintingTechnologies.AnyAsync())
            {
                await SeedPrintingTechnologiesAsync(context);
            }

            // Seed sample portfolio items if none exist
            if (!await context.PortfolioItems.AnyAsync())
            {
                await SeedPortfolioItemsAsync(context);
            }

            await context.SaveChangesAsync();
        }

        private static async Task SeedMaterialsAsync(ApplicationDbContext context)
        {
            var materials = new List<Material>
            {
                new Material
                {
                    Id = Guid.NewGuid(),
                    Name = "PLA (Standard)",
                    Description = "Biodegradable, easy to print, great for beginners. Low warping.",
                    Type = MaterialType.PLA,
                    PricePerGram = 0.025m,
                    AvailableColors = "White,Black,Red,Blue,Green,Yellow,Orange,Purple,Gray,Natural",
                    Properties = @"{""strength"":""Medium"",""flexibility"":""Low"",""maxTemp"":""60°C"",""biodegradable"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Material
                {
                    Id = Guid.NewGuid(),
                    Name = "ABS (High Strength)",
                    Description = "Strong, durable, heat resistant. Ideal for functional parts.",
                    Type = MaterialType.ABS,
                    PricePerGram = 0.030m,
                    AvailableColors = "White,Black,Red,Blue,Gray",
                    Properties = @"{""strength"":""High"",""flexibility"":""Low"",""maxTemp"":""98°C"",""biodegradable"":false}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Material
                {
                    Id = Guid.NewGuid(),
                    Name = "PETG (Engineering Grade)",
                    Description = "Strong, flexible, chemical resistant. Best of PLA and ABS.",
                    Type = MaterialType.PETG,
                    PricePerGram = 0.035m,
                    AvailableColors = "Clear,Black,White,Red,Blue,Orange",
                    Properties = @"{""strength"":""High"",""flexibility"":""Medium"",""maxTemp"":""80°C"",""foodSafe"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Material
                {
                    Id = Guid.NewGuid(),
                    Name = "TPU (Flexible)",
                    Description = "Rubber-like flexibility, excellent durability and impact resistance.",
                    Type = MaterialType.TPU,
                    PricePerGram = 0.045m,
                    AvailableColors = "Black,White,Red,Blue,Clear",
                    Properties = @"{""strength"":""Medium"",""flexibility"":""Very High"",""maxTemp"":""60°C"",""shore"":""95A""}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Material
                {
                    Id = Guid.NewGuid(),
                    Name = "Nylon (PA12)",
                    Description = "Extremely strong and durable. Excellent for functional parts.",
                    Type = MaterialType.Nylon,
                    PricePerGram = 0.055m,
                    AvailableColors = "Natural,Black,White",
                    Properties = @"{""strength"":""Very High"",""flexibility"":""Medium"",""maxTemp"":""120°C"",""wearResistant"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Material
                {
                    Id = Guid.NewGuid(),
                    Name = "Standard Resin",
                    Description = "High detail SLA resin for smooth surface finish.",
                    Type = MaterialType.Resin,
                    PricePerGram = 0.065m,
                    AvailableColors = "White,Black,Gray,Clear",
                    Properties = @"{""strength"":""Medium"",""detail"":""Very High"",""finish"":""Smooth"",""uv"":true}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            };

            await context.Materials.AddRangeAsync(materials);
        }

        private static async Task SeedPrintingTechnologiesAsync(ApplicationDbContext context)
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

            await context.PrintingTechnologies.AddRangeAsync(technologies);
        }

        private static async Task SeedPortfolioItemsAsync(ApplicationDbContext context)
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
                    Tags = "drone,racing,carbon,lightweight",
                    Category = PortfolioCategory.Prototyping,
                    IsFeatured = true,
                    DisplayOrder = 1,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow
                },
                new PortfolioItem
                {
                    Id = Guid.NewGuid(),
                    Title = "Architectural Scale Model",
                    Description = "1:100 scale model of modern office building",
                    DetailedDescription = "Highly detailed architectural model with removable floors and transparent windows. Printed in white resin for smooth finish.",
                    ImageUrl = "/portfolio/arch-model.jpg",
                    Tags = "architecture,model,resin,detailed",
                    Category = PortfolioCategory.Architecture,
                    IsFeatured = true,
                    DisplayOrder = 2,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow
                },
                new PortfolioItem
                {
                    Id = Guid.NewGuid(),
                    Title = "Medical Training Model",
                    Description = "Anatomically accurate heart model for medical education",
                    DetailedDescription = "Multi-part heart model with removable chambers. Printed in flexible TPU for realistic feel. Used by medical schools.",
                    ImageUrl = "/portfolio/heart-model.jpg",
                    Tags = "medical,education,anatomy,flexible",
                    Category = PortfolioCategory.Medical,
                    IsFeatured = true,
                    DisplayOrder = 3,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow
                }
            };

            await context.PortfolioItems.AddRangeAsync(portfolioItems);
        }
    }
}