# Day 2: Project Initialization Complete! 🎉

Congratulations! You've completed Day 2 setup. This README explains what was created and how to use it.

## What We Built Today

### 1. Database Schema
Complete PostgreSQL database with:
- **User Management**: Users, roles, authentication
- **Materials & Technologies**: PLA, ABS, PETG, TPU, Nylon, Resin
- **Orders**: Full order lifecycle with status tracking
- **Quote System**: Request quotes, get estimates
- **File Management**: Upload, analyze 3D models
- **Content**: Portfolio items, blog posts

### 2. Entity Framework Core Setup
- ApplicationDbContext with all entities
- Entity configurations with proper relationships
- Database seeder with sample data
- Migration system configured

### 3. Docker Infrastructure
- PostgreSQL 16 database
- pgAdmin for database management
- Azurite (local Azure Storage emulator)
- Redis (for future caching)

### 4. .NET Solution Structure
```
PrintHub/
├── src/
│   └── api/
│       ├── PrintHub.API/          # Web API project
│       ├── PrintHub.Core/         # Domain entities
│       ├── PrintHub.Infrastructure/  # Data access, EF
│       └── PrintHub.Tests/        # Unit tests
```

## Quick Start

### Option 1: Automated Setup (Recommended)

**On Mac/Linux:**
```bash
chmod +x setup-day2.sh
./setup-day2.sh
```

**On Windows (PowerShell as Admin):**
```powershell
.\setup-day2.ps1
```

### Option 2: Manual Setup

Follow the detailed guide in `DAY2_SETUP_GUIDE.md`

## What Gets Created

### Database Tables
1. **Users** - User accounts
2. **UserRoles** - Role assignments
3. **Materials** - Available printing materials
4. **PrintingTechnologies** - Available printing methods
5. **Orders** - Customer orders
6. **OrderItems** - Individual items in orders
7. **OrderStatusHistory** - Status change tracking
8. **QuoteRequests** - Quote requests from customers
9. **QuoteResponses** - Quotes provided by company
10. **UploadedFiles** - 3D model files
11. **FileAnalyses** - Analysis results of files
12. **PortfolioItems** - Showcase items
13. **BlogPosts** - Blog content

### Sample Data
The seeder creates:
- 6 materials (PLA, ABS, PETG, TPU, Nylon, Resin)
- 3 printing technologies
- 3 portfolio items
- All with realistic pricing and specifications

## Accessing the Services

### PostgreSQL Database
- **Host**: localhost:5432
- **Database**: printhub_dev
- **Username**: printhub_user
- **Password**: Dev_Password_123!

**Connection String:**
```
Host=localhost;Port=5432;Database=printhub_dev;Username=printhub_user;Password=Dev_Password_123!
```

### pgAdmin (Database UI)
- **URL**: http://localhost:5050
- **Email**: admin@printhub.local
- **Password**: admin123

**To connect to database in pgAdmin:**
1. Open http://localhost:5050
2. Right-click "Servers" → "Register" → "Server"
3. General tab: Name = "PrintHub Local"
4. Connection tab:
   - Host: postgres (or host.docker.internal on Mac)
   - Port: 5432
   - Database: printhub_dev
   - Username: printhub_user
   - Password: Dev_Password_123!
5. Save

### Azurite (Local Azure Storage)
- **Blob endpoint**: http://localhost:10000
- **Connection string**: Already configured in appsettings.Development.json

## Running the Application

### Start Docker Services
```bash
docker-compose up -d
```

### Start the API
```bash
cd src/api/PrintHub.API
dotnet run
```

The API will be available at:
- **HTTP**: http://localhost:5000
- **HTTPS**: https://localhost:5001
- **Swagger UI**: http://localhost:5000 (root)

### View API Documentation
Open http://localhost:5000 in your browser to see Swagger UI with all available endpoints.

### Run Tests
```bash
cd src/api/PrintHub.Tests
dotnet test
```

## Database Migrations

### Create a New Migration
```bash
cd src/api/PrintHub.API
dotnet ef migrations add MigrationName --project ../PrintHub.Infrastructure
```

### Apply Migrations
```bash
dotnet ef database update --project ../PrintHub.Infrastructure
```

### Revert Last Migration
```bash
dotnet ef migrations remove --project ../PrintHub.Infrastructure
```

### View Migration SQL
```bash
dotnet ef migrations script --project ../PrintHub.Infrastructure
```

## Useful Commands

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres

# Restart a service
docker-compose restart postgres

# Remove all data (DESTRUCTIVE!)
docker-compose down -v
```

### Database Commands
```bash
# Connect to database with psql
docker exec -it printhub-db psql -U printhub_user -d printhub_dev

# Backup database
docker exec printhub-db pg_dump -U printhub_user printhub_dev > backup.sql

# Restore database
docker exec -i printhub-db psql -U printhub_user printhub_dev < backup.sql
```

### Build Commands
```bash
# Build solution
dotnet build

# Build in Release mode
dotnet build -c Release

# Clean build artifacts
dotnet clean

# Restore NuGet packages
dotnet restore
```

## Project Structure Explained

### PrintHub.Core
**Purpose**: Domain models and interfaces (no dependencies on infrastructure)

**Contains**:
- `Entities/` - Domain entities (User, Order, Material, etc.)
- `Interfaces/` - Repository interfaces (to be added in Day 3)
- `DTOs/` - Data transfer objects (to be added in Day 3)

### PrintHub.Infrastructure
**Purpose**: Data access and external service implementations

**Contains**:
- `Data/ApplicationDbContext.cs` - EF Core DbContext
- `Data/Configurations/` - Entity configurations
- `Data/DatabaseSeeder.cs` - Database seeding
- `Migrations/` - EF Core migrations (auto-generated)

### PrintHub.API
**Purpose**: Web API endpoints and application configuration

**Contains**:
- `Program.cs` - Application startup
- `appsettings.json` - Configuration
- `Controllers/` - API controllers (to be added in Day 3)

### PrintHub.Tests
**Purpose**: Unit and integration tests

**Contains**:
- Unit tests (to be added)
- Integration tests (to be added)

## Configuration Files

### appsettings.json
Main configuration file with:
- Database connection strings
- JWT settings
- Blob storage configuration
- Logging configuration

### appsettings.Development.json
Development-specific overrides:
- Detailed logging
- Development database connection
- Local storage emulator settings

### docker-compose.yml
Defines all services:
- PostgreSQL database
- pgAdmin
- Azurite (Azure Storage emulator)
- Redis

## Troubleshooting

### "Port 5432 already in use"
Another PostgreSQL instance is running. Either:
1. Stop it: `sudo systemctl stop postgresql` (Linux)
2. Change the port in docker-compose.yml

### "Docker daemon is not running"
Start Docker Desktop

### "Cannot connect to database"
1. Check Docker is running: `docker ps`
2. Check database logs: `docker-compose logs postgres`
3. Ensure database is healthy: `docker exec printhub-db pg_isready`

### "Migration failed"
1. Check connection string in appsettings.json
2. Ensure database is running
3. Check for conflicting migrations

### "Package restore failed"
1. Clear NuGet cache: `dotnet nuget locals all --clear`
2. Restore again: `dotnet restore`

## Next Steps (Day 3)

Tomorrow we'll build:
1. Repository pattern implementation
2. Service layer
3. First API endpoints (Materials, Users)
4. Authentication with JWT
5. File upload functionality

## Resources

### Learning Resources
- [Entity Framework Core Docs](https://docs.microsoft.com/en-us/ef/core/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [ASP.NET Core Docs](https://docs.microsoft.com/en-us/aspnet/core/)

### Tools
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [.NET CLI Reference](https://docs.microsoft.com/en-us/dotnet/core/tools/)

## Database Schema Diagram

```
Users ──┬─> Orders ──> OrderItems ──> Materials
        │              └──> UploadedFiles ──> FileAnalyses
        │
        ├─> QuoteRequests ──> QuoteResponses
        │
        ├─> UserRoles
        │
        └─> BlogPosts

PortfolioItems ──> Materials (optional)
```

## Support

If you encounter issues:
1. Check this README's troubleshooting section
2. Review the detailed guide: `DAY2_SETUP_GUIDE.md`
3. Check Docker logs: `docker-compose logs`
4. Verify database connectivity

## Success Checklist

- [x] .NET solution created
- [x] All projects added and referenced correctly
- [x] NuGet packages installed
- [x] Docker services running
- [x] Database created and migrated
- [x] Sample data seeded
- [x] API builds successfully
- [x] Swagger UI accessible
- [ ] Ready for Day 3!

---

Great job completing Day 2! You now have a solid foundation with a professional database schema and infrastructure. Tomorrow we'll start building the API layer.