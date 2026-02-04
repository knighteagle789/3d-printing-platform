using Microsoft.EntityFrameworkCore;
using PrintHub.Infrastructure.Data;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/printhub-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database Configuration
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

    // Enable detailed errors in development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebApp", policy =>
    {
        policy.WithOrigins(
                builder.Configuration["WebAppUrl"] ?? "http://localhost:3000",
                "http://localhost:3000",
                "https://localhost:3000"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "PrintHub API V1");
        options.RoutePrefix = string.Empty; // Swagger at root
    });
}

app.UseSerilogRequestLogging();

app.UseHttpsRedirection();

app.UseCors("AllowWebApp");

app.UseAuthorization();

app.MapControllers();

// Simple health check endpoint
app.MapGet("/health", async (ApplicationDbContext db) =>
{
    try
    {
        // Try to connect to database
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

// Database Migration and Seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        
        // Apply migrations
        Log.Information("Applying database migrations...");
        await context.Database.MigrateAsync();
        
        // Seed database
        Log.Information("Seeding database...");
        await DatabaseSeeder.SeedAsync(context);
        
        Log.Information("Database initialization completed successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while migrating or seeding the database");
        throw;
    }
}

Log.Information("Starting PrintHub API...");
app.Run();

// Make the implicit Program class public for testing
public partial class Program { }