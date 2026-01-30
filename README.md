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
3. Navigate to API: `cd src/api`
4. Run migrations: `dotnet ef database update`
5. Start API: `dotnet run`
6. Navigate to Web: `cd src/web`
7. Install dependencies: `npm install`
8. Start dev server: `npm run dev`

## Project Structure
3d-printing-platform/
├── src/
│   ├── api/              # .NET 10 API
│   └── web/              # Next.js Frontend
├── infrastructure/       # IaC (Bicep/Terraform)
├── docs/                # Documentation
└── .github/workflows/   # CI/CD

## License

Private - All Rights Reserved