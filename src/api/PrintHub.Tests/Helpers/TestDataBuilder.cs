using PrintHub.Core.Entities;

namespace PrintHub.Tests.Helpers;

public static class TestDataBuilder
{
    public static User CreateUser(
        Guid? id = null,
        string email = "test@example.com",
        string firstName = "Test",
        string lastName = "User",
        bool isActive = true)
    {
        var user = new User
        {
            Id = id ?? Guid.NewGuid(),
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow,
            UserRoles = new List<UserRole>
            {
                new UserRole
                {
                    Id = Guid.NewGuid(),
                    Role = Role.Customer,
                    AssignedAt = DateTime.UtcNow
                }
            }
        };
        return user;
    }

    public static Material CreateMaterial(
        Guid? id = null,
        string name = "PLA",
        decimal pricePerGram = 0.05m,
        bool isActive = true)
    {
        return new Material
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            PricePerGram = pricePerGram,
            IsActive = isActive,
            AvailableColors = new[] { "Black", "White" },
            CreatedAt = DateTime.UtcNow
        };
    }

    public static UploadedFile CreateFile(
        Guid? id = null,
        Guid? userId = null,
        bool withAnalysis = true)
    {
        var file = new UploadedFile
        {
            Id = id ?? Guid.NewGuid(),
            UserId = userId ?? Guid.NewGuid(),
            OriginalFileName = "test-model.stl",
            StorageUrl = "https://storage.example.com/test-model.stl",
            FileSizeBytes = 1024,
            UploadedAt = DateTime.UtcNow
        };

        if (withAnalysis)
        {
            file.Analysis = new FileAnalysis
            {
                Id = Guid.NewGuid(),
                FileId = file.Id,
                EstimatedWeightGrams = 25.0m,
                EstimatedPrintTimeHours = 2.5m,
                VolumeInCubicMm = 12000m,
                AnalyzedAt = DateTime.UtcNow
            };
        }

        return file;
    }

    public static Order CreateOrder(
        Guid? id = null,
        Guid? userId = null,
        OrderStatus status = OrderStatus.Submitted)
    {
        var orderId = id ?? Guid.NewGuid();
        return new Order
        {
            Id = orderId,
            UserId = userId ?? Guid.NewGuid(),
            OrderNumber = "ORD-2026-00001",
            Status = status,
            TotalPrice = 25.00m,
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>(),
            StatusHistory = new List<OrderStatusHistory>()
        };
    }

    public static QuoteRequest CreateQuoteRequest(
        Guid? id = null,
        Guid? userId = null,
        QuoteStatus status = QuoteStatus.Pending,
        Guid? fileId = null,
        Guid? materialId = null)
    {
        return new QuoteRequest
        {
            Id = id ?? Guid.NewGuid(),
            UserId = userId ?? Guid.NewGuid(),
            RequestNumber = "QR-2026-00001",
            Status = status,
            FileId = fileId,
            PreferredMaterialId = materialId,
            Quantity = 1,
            CreatedAt = DateTime.UtcNow,
            Responses = new List<QuoteResponse>()
        };
    }

    public static QuoteResponse CreateQuoteResponse(
        Guid? quoteRequestId = null,
        Guid? adminUserId = null,
        decimal price = 50.00m,
        bool isAccepted = false)
    {
        return new QuoteResponse
        {
            Id = Guid.NewGuid(),
            QuoteRequestId = quoteRequestId ?? Guid.NewGuid(),
            Price = price,
            ShippingCost = 10.00m,
            EstimatedDays = 5,
            ExpiresAt = DateTime.UtcNow.AddDays(14),
            IsAccepted = isAccepted,
            CreatedByUserId = adminUserId ?? Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow
        };
    }
}