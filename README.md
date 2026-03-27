# 3D Printing Platform

A full-stack web application for managing 3D printing services.

## Technology Stack

- **Backend**: .NET 10 (ASP.NET Core Web API)
- **Frontend**: Next.js 14+ with React 18 and TypeScript
- **Database**: PostgreSQL 16
- **Cloud**: Azure (Free Tier)
- **3D Rendering**: Three.js with React Three Fiber

## Getting Started

### Prerequisites

- .NET 10 SDK
- Node.js 20 LTS
- Docker Desktop
- Azure CLI
- Git

### Local Development Setup

1. Clone repository
2. Start database: `docker-compose up -d`
3. ## After starting Docker services, run once:
    az storage cors add \
    --methods GET HEAD OPTIONS \
    --origins "http://localhost:3000" \
    --allowed-headers "*" \
    --exposed-headers "*" \
    --max-age 3600 \
    --services b \
    --connection-string "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
4. Navigate to API: `cd src/api`
5. Run migrations: `dotnet ef database update`
6. Start API: `dotnet run`
7. Navigate to Web: `cd src/web`
8. Install dependencies: `npm install`
9. Start dev server: `npm run dev`

## Project Structure
```
3d-printing-platform/ 
├── src/ 
│   ├── api/              # .NET 10 API 
│   └── web/              # Next.js Frontend 
├── infrastructure/       # IaC (Bicep/Terraform) 
├── docs/                 # Documentation 
└── .github/workflows/    # CI/CD
```

## License

Private - All Rights Reserved