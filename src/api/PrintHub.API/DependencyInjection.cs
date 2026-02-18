using PrintHub.API.Services;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IMaterialService, MaterialService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IQuoteService, QuoteService>();
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<IContentService, ContentService>();

        return services;
    }
}