using PrintHub.API.Services;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Core.Interfaces;
namespace PrintHub.API;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IMaterialService, MaterialService>();
        services.AddScoped<IPrintingTechnologyService, PrintingTechnologyService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IQuoteService, QuoteService>();
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<IContentService, ContentService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IMaterialIntakeService, MaterialIntakeService>();

        return services;
    }
}