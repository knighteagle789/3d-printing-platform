using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Serilog;
using Asp.Versioning;
using Asp.Versioning.ApiExplorer;
using PrintHub.Infrastructure.Data;
using PrintHub.Infrastructure;
using PrintHub.API;
using FluentValidation.AspNetCore;
using FluentValidation;
using PrintHub.API.Middleware;

// ─── Bootstrap Logger ─────────────────────────────────────────────────────────
// Set up temporary logger BEFORE builder so startup errors are captured
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting PrintHub API...");

    var builder = WebApplication.CreateBuilder(args);

    // ─── Serilog ──────────────────────────────────────────────────────────────
    // YOUR VERSION: File logging + log context enrichment (kept!)
    Log.Logger = new LoggerConfiguration()
        .ReadFrom.Configuration(builder.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File("logs/printhub-.txt", rollingInterval: RollingInterval.Day)
        .CreateLogger();

    builder.Host.UseSerilog();

    // ─── Controllers + Swagger ────────────────────────────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<Program>(); // Auto-register all validators in this assembly
    builder.Services.AddEndpointsApiExplorer();

    // ─── API Versioning ────────────────────────────────────────────────
    builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = new UrlSegmentApiVersionReader(); // Version in URL path
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV"; // e.g. v1, v2
        options.SubstituteApiVersionInUrl = true;
    });

    // .NET 10 simplified Swagger setup - JWT auth is auto-detected
    builder.Services.AddSwaggerGen(options =>
    {
        const string schemeId = "bearer";

        options.AddSecurityDefinition(schemeId, new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = schemeId,
            BearerFormat = "JWT",
            Description = "Paste a JWT here. Swagger will send: Authorization: Bearer {your token}"
        });

        options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(schemeId, document)] = []
        });
    });

    // ─── Database ─────────────────────────────────────────────────────────────
    // YOUR VERSION: EnableRetryOnFailure (kept - production resilience!)
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null
            );
            npgsqlOptions.MigrationsAssembly("PrintHub.Infrastructure");
        });

        if (builder.Environment.IsDevelopment())
        {
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
        }
    });

    builder.Services.AddInfrastructureServices(); // Register infrastructure services (repositories, etc.)
    builder.Services.AddApplicationServices();      // Register application services (business logic)

    // ─── Authentication ───────────────────────────────────────────────────────
    // MY VERSION: JWT authentication (needed before you add protected endpoints)
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(
                        builder.Configuration["Jwt:Key"]!))
            };
        });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("AdminOnly",
            policy => policy.RequireRole("Admin"));
        options.AddPolicy("StaffOrAdmin",
            policy => policy.RequireRole("Staff", "Admin"));
    });

    // ─── CORS ─────────────────────────────────────────────────────────────────
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowWebApp", policy =>
        {
            policy.WithOrigins(
                    builder.Configuration["WebAppUrl"] ?? "http://localhost:3000",
                    // Next.js dev server bumps port if 3000 is already taken
                    "http://localhost:3000",
                    "https://localhost:3000",
                    "http://localhost:3001",
                    "https://localhost:3001",
                    "http://localhost:3002",
                    "https://localhost:3002"
                )
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    var app = builder.Build();
    // ══════════════════════════════════════════════════════════════════════════

    // ─── Database Migration + Seeding ─────────────────────────────────────────
    // Must run BEFORE middleware pipeline so DB is ready for requests
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<ApplicationDbContext>();

            Log.Information("Applying database migrations...");
            await context.Database.MigrateAsync();

            // MY VERSION: Resolves from DI (matches new instance-based seeder)
            Log.Information("Seeding database...");
            var seeder = services.GetRequiredService<DatabaseSeeder>();
            await seeder.SeedAsync();

            Log.Information("Database initialization completed successfully.");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "An error occurred while migrating or seeding the database.");
            throw;
        }
    }

    // ─── Middleware Pipeline ──────────────────────────────────────────────────
    // ORDER MATTERS - each middleware runs in sequence for every request

    app.UseGlobalExceptionHandling();

    if (app.Environment.IsDevelopment())
    {
        var apiVersionDescription = app.Services
            .GetRequiredService<IApiVersionDescriptionProvider>()
            .ApiVersionDescriptions;
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            foreach (var description in apiVersionDescription)
            {
                options.SwaggerEndpoint(
                    $"/swagger/{description.GroupName}/swagger.json",
                    $"PrintHub API {description.GroupName.ToUpperInvariant()}");
            }
            options.RoutePrefix = string.Empty; // Swagger at root URL
        });
    }

    app.UseSerilogRequestLogging(); // Log all requests

    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();      // HTTP → HTTPS    
    }

    app.UseCors("AllowWebApp");     // CORS headers (must be before auth!)

    app.UseAuthentication();        // Who are you? (NEW - was missing!)

    app.UseAuthorization();         // What can you do?

    app.MapControllers();           // Route to controllers

    // YOUR VERSION: Custom health check (kept - more informative than NuGet package!)
    app.MapGet("/health", async (ApplicationDbContext db) =>
    {
        try
        {
            await db.Database.CanConnectAsync();
            return Results.Ok(new { status = "Healthy", database = "Connected" });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: 503,
                title: "Database connection failed"
            );
        }
    });

    Log.Information("PrintHub API started successfully!");
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "PrintHub API failed to start!");
    return 1;
}
finally
{
    // Ensure all logs are flushed before exit
    Log.CloseAndFlush();
}

return 0;

// Make the implicit Program class public for testing (YOUR VERSION - kept!)
public partial class Program { }