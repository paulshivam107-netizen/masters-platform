#!/bin/bash

echo "🎓 MBA/MS Application Platform"
echo "==============================="
echo ""
echo "✅ Running in FREE mock mode (no API key needed)"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""
echo "🚀 Starting application..."
echo "   This may take a few minutes on first run..."
echo ""
echo "Once started:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""

# Start containers
docker-compose up --build
