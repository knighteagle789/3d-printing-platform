using Microsoft.Extensions.DependencyInjection;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Infrastructure.Data;
using PrintHub.Infrastructure.Data.Repositories;
using PrintHub.Infrastructure.Services;

namespace PrintHub.Infrastructure;

/// <summary>
/// Extension method to register all Infrastructure layer services with DI.
/// Called from Program.cs: builder.Services.AddInfrastructureServices();
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
    {
        // Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Generic repository for any entity without a specialized repository
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

        // Specialized repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IMaterialRepository, MaterialRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IQuoteRepository, QuoteRepository>();
        services.AddScoped<IFileRepository, FileRepository>();
        services.AddScoped<IContentRepository, ContentRepository>();

        // Infrastructure services
        services.AddSingleton<IFileStorageService, BlobStorageService>();
        services.AddScoped<IStlAnalyzerService, StlAnalyzerService>();
        services.AddScoped<IEmailService, SendGridEmailService>();
        services.AddScoped<IPaymentService, StripePaymentService>();

        // Database Seeder
        services.AddScoped<DatabaseSeeder>();

        return services;
    }
}