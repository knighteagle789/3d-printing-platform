---
applyTo: '**'
---
# 3D Printing Company Website - Project Instructions

## Executive Summary
This project will create a full-stack web application for a 3D printing company using industry-standard technologies optimized for Azure deployment. The application follows a three-tier architecture with modern best practices.

---

## Technology Stack

### Data Layer
**PostgreSQL (Azure Database for PostgreSQL - Flexible Server)**
- **Why**: Free tier available in Azure, excellent performance, JSON support for flexible schemas, strong ACID compliance
- **Alternative**: Azure SQL Database (has free tier), but PostgreSQL offers better cost efficiency at scale
- **Tools**: Entity Framework Core 10 for ORM

### API Layer
**.NET 10 (ASP.NET Core Web API)**
- **Framework**: ASP.NET Core 10 Web API
- **Authentication**: Azure AD B2C or JWT with Identity
- **Documentation**: Swagger/OpenAPI
- **Key Features**: 
  - RESTful API design
  - Minimal APIs for lightweight endpoints
  - Background services for file processing
  - SignalR for real-time updates (print status, quotes)

### UI Layer
**React 18+ with TypeScript**
- **Why**: Industry standard, massive ecosystem, excellent for complex UIs, great 3D library support
- **Framework**: Next.js 14+ (App Router)
  - Server-side rendering for SEO
  - API routes for edge functions
  - Optimized performance
  - Built-in Azure Static Web Apps support
- **3D Viewer**: Three.js with React Three Fiber
  - Industry standard for 3D on web
  - Supports STL, OBJ, GLTF formats (common in 3D printing)
  - Excellent performance and customization
- **UI Components**: shadcn/ui or Material-UI
- **State Management**: React Query (TanStack Query) + Zustand
- **Styling**: Tailwind CSS

### Azure Services Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Azure Front Door                      │
│              (CDN + WAF + SSL Management)                │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                    ┌────────▼────────┐
│ Static Web App │                    │   App Service   │
│   (Next.js)    │                    │  (.NET 10 API)  │
│  Free/Standard │                    │   Free/Basic    │
└────────────────┘                    └─────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
            ┌───────▼─────┐         ┌────────▼────────┐   ┌───────▼────────┐
            │  Blob Storage│         │   PostgreSQL    │   │  Azure Storage │
            │ (3D Files)   │         │ Flexible Server │   │    Queue       │
            │   Hot Tier   │         │   Free Tier     │   │  (Processing)  │
            └──────────────┘         └─────────────────┘   └────────────────┘
```

---

## Project Structure

### Repository Organization
```
3d-printing-platform/
├── src/
│   ├── api/                          # .NET 10 API
│   │   ├── PrintHub.API/
│   │   ├── PrintHub.Core/            # Domain models, interfaces
│   │   ├── PrintHub.Infrastructure/  # Data access, external services
│   │   └── PrintHub.Tests/
│   │
│   ├── web/                          # Next.js Frontend
│   │   ├── app/                      # App router pages
│   │   ├── components/
│   │   ├── lib/                      # Utilities, API clients
│   │   ├── public/
│   │   └── styles/
│   │
│   └── shared/                       # Shared types, constants
│
├── infrastructure/                   # IaC (Bicep/Terraform)
├── docs/                            # Documentation
└── .github/workflows/               # CI/CD pipelines
```

---

## Phase 1: Foundation & Setup (Week 1-2)

### 1.1 Development Environment Setup
- [X] Install .NET 10 SDK
- [X] Install Node.js 20 LTS
- [X] Install Docker Desktop (for local PostgreSQL)
- [X] Install Azure CLI
- [X] Install VS Code with extensions:
  - C# Dev Kit
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Azure Tools
- [X] Create Azure free account
- [X] Set up Git repository

### 1.2 Project Initialization

#### API Setup
```bash
# Create solution and projects
dotnet new sln -n PrintHub
dotnet new webapi -n PrintHub.API -o src/api/PrintHub.API
dotnet new classlib -n PrintHub.Core -o src/api/PrintHub.Core
dotnet new classlib -n PrintHub.Infrastructure -o src/api/PrintHub.Infrastructure
dotnet new xunit -n PrintHub.Tests -o src/api/PrintHub.Tests

# Add projects to solution
dotnet sln add src/api/PrintHub.API
dotnet sln add src/api/PrintHub.Core
dotnet sln add src/api/PrintHub.Infrastructure
dotnet sln add src/api/PrintHub.Tests

# Add project references
cd src/api/PrintHub.API
dotnet add reference ../PrintHub.Core
dotnet add reference ../PrintHub.Infrastructure

cd ../PrintHub.Infrastructure
dotnet add reference ../PrintHub.Core

cd ../PrintHub.Tests
dotnet add reference ../PrintHub.API
dotnet add reference ../PrintHub.Core
```

#### Install Key NuGet Packages
```bash
# In PrintHub.API
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Swashbuckle.AspNetCore
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package FluentValidation.AspNetCore
dotnet add package Serilog.AspNetCore
dotnet add package Azure.Storage.Blobs

# In PrintHub.Infrastructure
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Dapper
```

#### UI Setup
```bash
# Create Next.js app with TypeScript
npx create-next-app@latest src/web --typescript --tailwind --app --eslint

cd src/web

# Install key dependencies
npm install @tanstack/react-query zustand
npm install three @react-three/fiber @react-three/drei
npm install @types/three
npm install axios
npm install shadcn-ui
npm install lucide-react
```

---

## Phase 2: Data Layer Development (Week 2-3)

### 2.1 Database Design

#### Core Entities
```csharp
// User Management
- Users (Id, Email, PasswordHash, FirstName, LastName, CreatedAt)
- UserRoles (Id, UserId, Role)

// Product Catalog
- Materials (Id, Name, Description, PricePerGram, ColorOptions, Properties)
- PrintingTechnologies (Id, Name, Description, MaxDimensions)

// Order Management
- Orders (Id, UserId, Status, TotalPrice, CreatedAt, UpdatedAt)
- OrderItems (Id, OrderId, FileName, FileUrl, MaterialId, Quantity, Price)
- OrderStatusHistory (Id, OrderId, Status, ChangedAt, ChangedBy)

// Quote System
- QuoteRequests (Id, UserId, Status, ModelFileUrl, RequiredDate, Notes)
- QuoteResponses (Id, QuoteRequestId, Price, EstimatedDays, ExpiresAt)

// File Management
- UploadedFiles (Id, UserId, OriginalFileName, StorageUrl, FileSize, UploadedAt)
- FileAnalysis (Id, FileId, Volume, Dimensions, Complexity, EstimatedPrintTime)

// Content Management
- PortfolioItems (Id, Title, Description, ImageUrls, Tags, Featured)
- BlogPosts (Id, Title, Content, AuthorId, PublishedAt)
```

### 2.2 Entity Framework Core Setup

#### Create DbContext
```csharp
// PrintHub.Infrastructure/Data/ApplicationDbContext.cs
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Material> Materials { get; set; }
    public DbSet<QuoteRequest> QuoteRequests { get; set; }
    public DbSet<PortfolioItem> PortfolioItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
```

#### Create Entity Configurations
```csharp
// PrintHub.Infrastructure/Data/Configurations/OrderConfiguration.cs
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        
        builder.Property(o => o.TotalPrice)
            .HasPrecision(18, 2);
            
        builder.HasOne(o => o.User)
            .WithMany(u => u.Orders)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasIndex(o => o.Status);
        builder.HasIndex(o => o.CreatedAt);
    }
}
```

### 2.3 Local PostgreSQL Setup
```bash
# Docker Compose for local development
# Create docker-compose.yml in project root
```

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: printhub_dev
      POSTGRES_USER: printhub_user
      POSTGRES_PASSWORD: Dev_Password_123!
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Start database
docker-compose up -d

# Create initial migration
cd src/api/PrintHub.API
dotnet ef migrations add InitialCreate --project ../PrintHub.Infrastructure
dotnet ef database update --project ../PrintHub.Infrastructure
```

### 2.4 Repository Pattern
```csharp
// PrintHub.Core/Interfaces/IRepository.cs
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(Guid id);
}

// PrintHub.Core/Interfaces/IOrderRepository.cs
public interface IOrderRepository : IRepository<Order>
{
    Task<IEnumerable<Order>> GetUserOrdersAsync(Guid userId);
    Task<Order?> GetOrderWithItemsAsync(Guid orderId);
    Task<IEnumerable<Order>> GetOrdersByStatusAsync(OrderStatus status);
}
```

---

## Phase 3: API Layer Development (Week 3-5)

### 3.1 Clean Architecture Setup

#### Domain Models (PrintHub.Core/Entities)
```csharp
public class Order
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public OrderStatus Status { get; set; }
    public decimal TotalPrice { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public User User { get; set; }
    public ICollection<OrderItem> Items { get; set; }
}

public enum OrderStatus
{
    Draft,
    Submitted,
    InReview,
    Approved,
    Printing,
    QualityCheck,
    Shipped,
    Completed,
    Cancelled
}
```

#### DTOs (PrintHub.Core/DTOs)
```csharp
public record CreateOrderRequest(
    List<OrderItemDto> Items
);

public record OrderItemDto(
    Guid FileId,
    Guid MaterialId,
    int Quantity,
    string? Notes
);

public record OrderResponse(
    Guid Id,
    OrderStatus Status,
    decimal TotalPrice,
    DateTime CreatedAt,
    List<OrderItemResponse> Items
);
```

#### API Controllers
```csharp
// PrintHub.API/Controllers/OrdersController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    
    [HttpPost]
    public async Task<ActionResult<OrderResponse>> CreateOrder(
        CreateOrderRequest request)
    {
        var userId = User.GetUserId();
        var order = await _orderService.CreateOrderAsync(userId, request);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderResponse>> GetOrder(Guid id)
    {
        var order = await _orderService.GetOrderAsync(id);
        return order != null ? Ok(order) : NotFound();
    }
}
```

### 3.2 File Upload & Processing

#### Blob Storage Service
```csharp
// PrintHub.Infrastructure/Services/BlobStorageService.cs
public class BlobStorageService : IFileStorageService
{
    private readonly BlobServiceClient _blobServiceClient;
    
    public async Task<string> UploadFileAsync(
        Stream fileStream, 
        string fileName, 
        string contentType)
    {
        var containerClient = _blobServiceClient
            .GetBlobContainerClient("3d-models");
            
        var blobName = $"{Guid.NewGuid()}_{fileName}";
        var blobClient = containerClient.GetBlobClient(blobName);
        
        await blobClient.UploadAsync(fileStream, new BlobHttpHeaders 
        { 
            ContentType = contentType 
        });
        
        return blobClient.Uri.ToString();
    }
}
```

#### 3D File Analysis Service
```csharp
// PrintHub.Infrastructure/Services/StlAnalyzerService.cs
public class StlAnalyzerService
{
    public async Task<FileAnalysisResult> AnalyzeStlFileAsync(Stream fileStream)
    {
        // Parse STL file to calculate:
        // - Volume (for material cost)
        // - Bounding box dimensions
        // - Triangle count (complexity)
        // - Estimated print time
        
        // This can use libraries like:
        // - QuantityTypes for units
        // - Custom STL parser
        
        return new FileAnalysisResult
        {
            Volume = calculatedVolume,
            Dimensions = new Dimensions(x, y, z),
            TriangleCount = triangles.Count,
            EstimatedPrintTime = CalculatePrintTime(volume, complexity)
        };
    }
}
```

### 3.3 Authentication & Authorization

#### JWT Configuration
```csharp
// Program.cs
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
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => 
        policy.RequireRole("Admin"));
});
```

### 3.4 API Best Practices

#### Versioning
```csharp
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
});
```

#### Rate Limiting (.NET 10)
```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", opts =>
    {
        opts.PermitLimit = 100;
        opts.Window = TimeSpan.FromMinutes(1);
    });
});
```

#### CORS
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebApp", policy =>
    {
        policy.WithOrigins(builder.Configuration["WebAppUrl"])
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

#### Global Error Handling
```csharp
// Middleware/GlobalExceptionHandler.cs
app.UseExceptionHandler(appError =>
{
    appError.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        
        var contextFeature = context.Features.Get<IExceptionHandlerFeature>();
        if (contextFeature != null)
        {
            logger.LogError(contextFeature.Error, "Unhandled exception");
            
            await context.Response.WriteAsJsonAsync(new
            {
                StatusCode = context.Response.StatusCode,
                Message = "Internal Server Error"
            });
        }
    });
});
```

---

## Phase 4: UI Layer Development (Week 5-8)

### 4.1 Next.js Project Structure
```
src/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── orders/
│   │   ├── quotes/
│   │   └── profile/
│   ├── (public)/
│   │   ├── about/
│   │   ├── portfolio/
│   │   └── pricing/
│   ├── api/                    # Edge API routes
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                     # shadcn components
│   ├── 3d-viewer/
│   ├── forms/
│   ├── layout/
│   └── shared/
├── lib/
│   ├── api-client.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── hooks/
└── types/
    └── api-types.ts
```

### 4.2 3D Model Viewer Component

```typescript
// components/3d-viewer/StlViewer.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid } from '@react-three/drei';
import { StlModel } from './StlModel';

interface StlViewerProps {
  modelUrl: string;
  onAnalysisComplete?: (analysis: ModelAnalysis) => void;
}

export function StlViewer({ modelUrl, onAnalysisComplete }: StlViewerProps) {
  return (
    <div className="h-[600px] w-full border rounded-lg bg-gray-50">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Stage environment="city" intensity={0.6}>
          <StlModel url={modelUrl} onAnalysisComplete={onAnalysisComplete} />
        </Stage>
        <Grid infiniteGrid />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
```

```typescript
// components/3d-viewer/StlModel.tsx
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useEffect } from 'react';

export function StlModel({ url, onAnalysisComplete }) {
  const geometry = useLoader(STLLoader, url);
  
  useEffect(() => {
    if (geometry && onAnalysisComplete) {
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      
      onAnalysisComplete({
        dimensions: {
          x: bbox.max.x - bbox.min.x,
          y: bbox.max.y - bbox.min.y,
          z: bbox.max.z - bbox.min.z,
        },
        triangleCount: geometry.attributes.position.count / 3,
      });
    }
  }, [geometry, onAnalysisComplete]);
  
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
}
```

### 4.3 API Client Setup

```typescript
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

```typescript
// lib/api/orders.ts
import apiClient from '../api-client';
import { Order, CreateOrderRequest, OrderResponse } from '@/types/api-types';

export const ordersApi = {
  getAll: () => apiClient.get<OrderResponse[]>('/orders'),
  
  getById: (id: string) => apiClient.get<OrderResponse>(`/orders/${id}`),
  
  create: (data: CreateOrderRequest) => 
    apiClient.post<OrderResponse>('/orders', data),
    
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ fileId: string; url: string }>(
      '/files/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },
};
```

### 4.4 State Management

```typescript
// lib/stores/useOrderStore.ts
import { create } from 'zustand';
import { OrderItem } from '@/types/api-types';

interface OrderStore {
  items: OrderItem[];
  addItem: (item: OrderItem) => void;
  removeItem: (fileId: string) => void;
  updateQuantity: (fileId: string, quantity: number) => void;
  clear: () => void;
  getTotalPrice: () => number;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  items: [],
  
  addItem: (item) => set((state) => ({
    items: [...state.items, item],
  })),
  
  removeItem: (fileId) => set((state) => ({
    items: state.items.filter(i => i.fileId !== fileId),
  })),
  
  updateQuantity: (fileId, quantity) => set((state) => ({
    items: state.items.map(i => 
      i.fileId === fileId ? { ...i, quantity } : i
    ),
  })),
  
  clear: () => set({ items: [] }),
  
  getTotalPrice: () => {
    return get().items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
  },
}));
```

### 4.5 Key Pages

#### Upload & Quote Request Page
```typescript
// app/(dashboard)/upload/page.tsx
'use client';

import { useState } from 'react';
import { StlViewer } from '@/components/3d-viewer/StlViewer';
import { useOrderStore } from '@/lib/stores/useOrderStore';
import { ordersApi } from '@/lib/api/orders';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState(null);
  const addItem = useOrderStore((state) => state.addItem);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    
    // Create temporary URL for preview
    const url = URL.createObjectURL(uploadedFile);
    setModelUrl(url);
    
    // Upload to server
    const response = await ordersApi.uploadFile(uploadedFile);
    // Handle response...
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Upload 3D Model</h1>
      
      <input
        type="file"
        accept=".stl,.obj"
        onChange={handleFileUpload}
        className="mb-4"
      />
      
      {modelUrl && (
        <StlViewer 
          modelUrl={modelUrl}
          onAnalysisComplete={setAnalysis}
        />
      )}
      
      {analysis && (
        <div className="mt-4 p-4 border rounded">
          <h3>Model Analysis</h3>
          <p>Dimensions: {analysis.dimensions.x} x {analysis.dimensions.y} x {analysis.dimensions.z} mm</p>
          <p>Triangles: {analysis.triangleCount}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 5: Azure Deployment (Week 8-9)

### 5.1 Azure Resources Setup

#### Create Resources (via Azure CLI)
```bash
# Set variables
RESOURCE_GROUP="rg-printhub-prod"
LOCATION="eastus"
APP_NAME="printhub"

# Login
az login

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create PostgreSQL Flexible Server (Free Tier)
az postgres flexible-server create \
  --name ${APP_NAME}-db \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user printhubadmin \
  --admin-password <SecurePassword> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16

# Create App Service Plan (Free Tier)
az appservice plan create \
  --name ${APP_NAME}-plan \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku F1 \
  --is-linux

# Create Web App for API
az webapp create \
  --name ${APP_NAME}-api \
  --resource-group $RESOURCE_GROUP \
  --plan ${APP_NAME}-plan \
  --runtime "DOTNETCORE:10.0"

# Create Static Web App for Frontend (Free Tier)
az staticwebapp create \
  --name ${APP_NAME}-web \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Create Storage Account for blobs
az storage account create \
  --name ${APP_NAME}storage \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Create blob container
az storage container create \
  --name 3d-models \
  --account-name ${APP_NAME}storage \
  --public-access blob
```

### 5.2 CI/CD Pipeline (GitHub Actions)

#### API Deployment
```yaml
# .github/workflows/api-deploy.yml
name: Deploy API to Azure

on:
  push:
    branches: [ main ]
    paths:
      - 'src/api/**'

env:
  AZURE_WEBAPP_NAME: printhub-api
  DOTNET_VERSION: '10.0.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: ${{ env.DOTNET_VERSION }}
    
    - name: Build and publish
      run: |
        cd src/api
        dotnet restore
        dotnet build --configuration Release
        dotnet publish -c Release -o ./publish
    
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ env.AZURE_WEBAPP_NAME }}
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: ./src/api/publish
```

#### Frontend Deployment
```yaml
# .github/workflows/web-deploy.yml
name: Deploy Web to Azure Static Web Apps

on:
  push:
    branches: [ main ]
    paths:
      - 'src/web/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build And Deploy
      uses: Azure/static-web-apps-deploy@v1
      with:
        azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        action: "upload"
        app_location: "/src/web"
        api_location: ""
        output_location: ".next"
```

### 5.3 Configuration & Secrets

#### API Configuration (Azure App Settings)
```bash
# Set environment variables
az webapp config appsettings set \
  --name printhub-api \
  --resource-group rg-printhub-prod \
  --settings \
    ConnectionStrings__DefaultConnection="Host=printhub-db.postgres.database.azure.com;Database=printhub;Username=printhubadmin;Password=<password>" \
    BlobStorage__ConnectionString="<storage-connection-string>" \
    BlobStorage__ContainerName="3d-models" \
    Jwt__Key="<jwt-secret-key>" \
    Jwt__Issuer="https://printhub-api.azurewebsites.net" \
    Jwt__Audience="https://printhub-web.azurestaticapps.net"
```

#### Frontend Environment Variables
```env
# .env.production
NEXT_PUBLIC_API_URL=https://printhub-api.azurewebsites.net/api
NEXT_PUBLIC_BLOB_STORAGE_URL=https://printhubstorage.blob.core.windows.net
```

---

## Phase 6: Testing & Quality (Ongoing)

### 6.1 API Testing

#### Unit Tests
```csharp
// PrintHub.Tests/Services/OrderServiceTests.cs
public class OrderServiceTests
{
    [Fact]
    public async Task CreateOrder_WithValidData_ReturnsOrder()
    {
        // Arrange
        var mockRepo = new Mock<IOrderRepository>();
        var service = new OrderService(mockRepo.Object);
        
        // Act
        var result = await service.CreateOrderAsync(userId, orderRequest);
        
        // Assert
        Assert.NotNull(result);
        Assert.Equal(OrderStatus.Draft, result.Status);
    }
}
```

#### Integration Tests
```csharp
public class OrdersControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    
    [Fact]
    public async Task GetOrders_ReturnsSuccessStatusCode()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/orders");
        response.EnsureSuccessStatusCode();
    }
}
```

### 6.2 Frontend Testing

```typescript
// __tests__/components/StlViewer.test.tsx
import { render, screen } from '@testing-library/react';
import { StlViewer } from '@/components/3d-viewer/StlViewer';

describe('StlViewer', () => {
  it('renders canvas element', () => {
    render(<StlViewer modelUrl="/test.stl" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
```

---

## Phase 7: Advanced Features (Week 10+)

### 7.1 Real-time Order Updates (SignalR)
```csharp
// PrintHub.API/Hubs/OrderHub.cs
public class OrderHub : Hub
{
    public async Task SubscribeToOrder(string orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, orderId);
    }
    
    public async Task NotifyOrderStatusChange(string orderId, OrderStatus status)
    {
        await Clients.Group(orderId).SendAsync("OrderStatusChanged", status);
    }
}
```

### 7.2 Payment Integration (Stripe)
```csharp
// Install Stripe.net package
dotnet add package Stripe.net

// PrintHub.Infrastructure/Services/PaymentService.cs
public class StripePaymentService : IPaymentService
{
    public async Task<PaymentIntent> CreatePaymentIntentAsync(decimal amount)
    {
        var options = new PaymentIntentCreateOptions
        {
            Amount = (long)(amount * 100), // Convert to cents
            Currency = "usd",
        };
        
        var service = new PaymentIntentService();
        return await service.CreateAsync(options);
    }
}
```

### 7.3 Email Notifications (SendGrid)
```csharp
// PrintHub.Infrastructure/Services/EmailService.cs
public class SendGridEmailService : IEmailService
{
    public async Task SendOrderConfirmationAsync(Order order)
    {
        var msg = new SendGridMessage
        {
            From = new EmailAddress("noreply@printhub.com"),
            Subject = $"Order Confirmation #{order.Id}",
            HtmlContent = GenerateEmailTemplate(order)
        };
        
        msg.AddTo(order.User.Email);
        await _client.SendEmailAsync(msg);
    }
}
```

### 7.4 Admin Dashboard
- Order management interface
- Material/pricing configuration
- User management
- Analytics and reporting

### 7.5 AI Features (OpenAI Integration)
- Automated quote generation based on model complexity
- Material recommendations
- Print optimization suggestions
- Customer support chatbot

---

## Best Practices Checklist

### Security
- [ ] HTTPS everywhere
- [ ] JWT token expiration and refresh
- [ ] Input validation and sanitization
- [ ] SQL injection prevention (use parameterized queries)
- [ ] File upload size limits and type validation
- [ ] Rate limiting on all endpoints
- [ ] CORS properly configured
- [ ] Secrets in Azure Key Vault (not in code)
- [ ] Regular dependency updates

### Performance
- [ ] Database indexing on frequently queried fields
- [ ] Caching strategy (Redis for production)
- [ ] Image optimization for portfolio
- [ ] Lazy loading for 3D models
- [ ] CDN for static assets
- [ ] API response pagination
- [ ] Database connection pooling
- [ ] Async/await throughout

### Code Quality
- [ ] Consistent naming conventions
- [ ] XML documentation on public APIs
- [ ] Unit test coverage >70%
- [ ] Code reviews before merging
- [ ] Linting and formatting (Prettier, ESLint)
- [ ] Git commit message standards
- [ ] Dependency injection throughout
- [ ] Logging with structured logging (Serilog)

### DevOps
- [ ] Automated CI/CD pipelines
- [ ] Staging environment before production
- [ ] Database migration strategy
- [ ] Rollback procedures
- [ ] Monitoring and alerts (Application Insights)
- [ ] Automated backups
- [ ] Load testing before launch

---

## Learning Resources

### .NET & C#
- Microsoft Learn: ASP.NET Core tutorials
- Clean Architecture by Jason Taylor
- Pluralsight: .NET courses

### React & Next.js
- Next.js official documentation
- React Three Fiber documentation
- TypeScript handbook

### Azure
- Azure Free Tier documentation
- Azure Architecture Center
- Microsoft Learn: Azure Fundamentals

### 3D Programming
- Three.js Journey course
- WebGL fundamentals
- STL file format specification

---

## Milestones & Timeline

### Month 1
- ✅ Environment setup
- ✅ Database design and creation
- ✅ Core API endpoints (CRUD)
- ✅ Basic authentication

### Month 2
- ✅ File upload functionality
- ✅ 3D viewer implementation
- ✅ Frontend scaffolding
- ✅ User registration/login UI

### Month 3
- ✅ Complete order flow
- ✅ Quote request system
- ✅ Portfolio/gallery pages
- ✅ Admin panel basics

### Month 4
- ✅ Azure deployment
- ✅ CI/CD pipelines
- ✅ Payment integration
- ✅ Production testing

### Ongoing
- Feature enhancements
- Performance optimization
- User feedback implementation
- SEO optimization

---

## Support & Community

### When You Get Stuck
1. Check official documentation first
2. Search Stack Overflow
3. GitHub Issues for specific libraries
4. Azure Support (included in free tier)
5. Reddit: r/dotnet, r/reactjs, r/nextjs
6. Discord: Reactiflux, .NET Discord

### Keeping Current
- Follow .NET Blog
- Next.js blog
- Azure updates
- Weekly newsletters: C# Digest, React Status

---

## Next Steps

1. **Set up your development environment** (Phase 1.1)
2. **Initialize Git repository** and push to GitHub
3. **Create Azure free account** and familiarize with portal
4. **Start with database layer** - it's the foundation
5. **Build API incrementally** - one feature at a time
6. **Create simple UI first** - add complexity gradually

**Remember**: This is a learning project. Don't try to implement everything at once. Start with the core user journey (upload model → get quote → place order) and expand from there.

Good luck! 🚀