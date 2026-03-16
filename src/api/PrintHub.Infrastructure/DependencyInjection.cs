using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.DependencyInjection;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Infrastructure.Data;
using PrintHub.Infrastructure.Data.Repositories;
using PrintHub.Infrastructure.Services;
using PrintHub.Infrastructure.Services.Extraction;
using Resend;

namespace PrintHub.Infrastructure;

/// <summary>
/// Extension method to register all Infrastructure layer services with DI.
/// Called from Program.cs: builder.Services.AddInfrastructureServices();
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Generic repository for any entity without a specialized repository
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

        // Specialized repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IMaterialRepository, MaterialRepository>();
        services.AddScoped<IPrintingTechnologyRepository, PrintingTechnologyRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IQuoteRepository, QuoteRepository>();
        services.AddScoped<IFileRepository, FileRepository>();
        services.AddScoped<IContentRepository, ContentRepository>();
        services.AddScoped<IMaterialIntakeRepository, MaterialIntakeRepository>();

        // Infrastructure services
        services.AddSingleton<IFileStorageService, BlobStorageService>();
        services.AddScoped<IStlAnalyzerService, StlAnalyzerService>();
        services.AddScoped<IPaymentService, StripePaymentService>();
        services.AddOptions();
        services.AddHttpClient<IResend, ResendClient>();
        services.Configure<ResendClientOptions>(o =>
            o.ApiToken = configuration["Email:ResendApiKey"] ?? string.Empty);
        services.AddOptions();
        services.AddScoped<IEmailService, ResendEmailService>();

        // Extraction provider — selected by Intake:Extractor:Provider config value
        var extractorProvider = configuration["Intake:Extractor:Provider"] ?? "Mock";
        if (extractorProvider.Equals("AzureVision", StringComparison.OrdinalIgnoreCase))
        {
            // AzureVisionExtractionProvider registered in #15
            // services.AddScoped<IExtractionProvider, AzureVisionExtractionProvider>();
            services.AddScoped<IExtractionProvider, MockExtractionProvider>(); // temporary until #15
        }
        else
        {
            services.AddScoped<IExtractionProvider, MockExtractionProvider>();
        }

        // Database Seeder
        services.AddScoped<DatabaseSeeder>();

        return services;
    }
}