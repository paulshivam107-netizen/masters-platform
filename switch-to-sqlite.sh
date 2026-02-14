#!/bin/bash

echo "🔧 Switching to SQLite (no Docker Hub needed)..."
echo ""

# Update backend to use SQLite
cat > "backend/database.py" << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use SQLite instead of PostgreSQL
DATABASE_URL = "sqlite:///./mba_platform.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF

# Update requirements.txt (remove psycopg2)
cat > "backend/requirements.txt" << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
anthropic==0.7.8
python-dotenv==1.0.0
bcrypt==4.1.1
email-validator==2.1.0
EOF

# Simplified docker-compose (no postgres)
cat > "docker-compose.yml" << 'EOF'
services:
  # Backend API (FastAPI)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mba_backend
    environment:
      MOCK_MODE: ${MOCK_MODE:-true}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      SECRET_KEY: ${SECRET_KEY:-your-secret-key-change-in-production}
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  # Frontend (React)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mba_frontend
    environment:
      REACT_APP_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    stdin_open: true
    tty: true
EOF

echo "✅ Switched to SQLite database"
echo ""
echo "This bypasses the PostgreSQL Docker image issue."
echo "Your data will be stored in backend/mba_platform.db"
echo ""
echo "Now run:"
echo "  docker-compose down"
echo "  docker-compose up --build"
echo ""
