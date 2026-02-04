#!/bin/bash

echo "🔍 Verifying Development Environment Setup"
echo "=========================================="
echo ""

# Check .NET
echo "✓ Checking .NET SDK..."
dotnet --version || echo "❌ .NET SDK not found"
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version || echo "❌ Node.js not found"
echo ""

# Check npm
echo "✓ Checking npm..."
npm --version || echo "❌ npm not found"
echo ""

# Check Docker
echo "✓ Checking Docker..."
docker --version || echo "❌ Docker not found"
echo ""

# Check Docker Compose
echo "✓ Checking Docker Compose..."
docker-compose --version || echo "❌ Docker Compose not found"
echo ""

# Check Git
echo "✓ Checking Git..."
git --version || echo "❌ Git not found"
echo ""

# Check Azure CLI
echo "✓ Checking Azure CLI..."
az --version | head -n 1 || echo "❌ Azure CLI not found"
echo ""

# Check PostgreSQL container
echo "✓ Checking PostgreSQL container..."
docker-compose ps | grep postgres || echo "❌ PostgreSQL container not running"
echo ""

echo "=========================================="
echo "✅ Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Open VS Code: code ."
echo "2. Install VS Code extensions (see guide)"
echo "3. Review project structure"
echo "4. Tomorrow: Start building the API!"