# Justfile for AI Operations Exception Agent (Industrial Services)
# Reference: https://github.com/casey/just

set shell := ["bash", "-c"]

# Default recipe starts all services
default: start

# Aliases for convenience
alias up := start
alias dev := start
alias verify := seed

# Print available commands
help:
    @just --list

# Start all 3 core services concurrently (Backend API, Agentic Worker, and Frontend)
start:
    #!/usr/bin/env bash
    set -eo pipefail

    VENV_PY=".venv/bin/python"
    UVICORN=".venv/bin/uvicorn"

    if [ ! -f "$UVICORN" ]; then
        echo "❌ Error: Virtual environment (.venv) not found."
        echo "Please run 'just install' to initialize dependencies."
        exit 1
    fi

    echo "========================================================================"
    echo "  🚀 AI Operations Exception Agent - Industrial Services"
    echo "========================================================================"
    echo "  📡 Backend API:         http://127.0.0.1:8000"
    echo "  📖 API Swagger Docs:    http://127.0.0.1:8000/docs"
    echo "  🤖 Agentic Worker:      http://127.0.0.1:8080"
    echo "  📖 Agentic Docs:        http://127.0.0.1:8080/docs"
    echo "  💻 Frontend Dashboard:  http://localhost:3000"
    echo "------------------------------------------------------------------------"
    echo "  🔑 Default Account:     manager@apexwaste.com / OperationsPass123!"
    echo "========================================================================"
    echo "  Press Ctrl+C at any time to gracefully terminate all services."
    echo "========================================================================"
    echo ""

    # Cleanup trap to kill all background processes on exit
    cleanup() {
        echo ""
        echo "🛑 [just] Stopping all running services..."
        trap - SIGINT SIGTERM EXIT
        kill $BACKEND_PID $AGENTIC_PID $FRONTEND_PID 2>/dev/null || true
        kill $(jobs -p) 2>/dev/null || true
        wait 2>/dev/null || true
        echo "✅ [just] All services stopped cleanly."
        exit 0
    }

    trap cleanup SIGINT SIGTERM EXIT

    # 1. Start FastAPI Backend API (port 8000)
    echo "▶️  Starting Backend API on port 8000..."
    PYTHONPATH=. $UVICORN backend.main:app --host 127.0.0.1 --port 8000 --reload &
    BACKEND_PID=$!

    # 2. Start LangGraph Agentic Investigation Worker (port 8080)
    echo "▶️  Starting Agentic Worker on port 8080..."
    PYTHONPATH=. $UVICORN agentic.main:app --host 127.0.0.1 --port 8080 --reload &
    AGENTIC_PID=$!

    # 3. Start Next.js Frontend Dashboard (port 3000)
    echo "▶️  Starting Next.js Frontend on port 3000..."
    (cd frontend && npm run dev) &
    FRONTEND_PID=$!

    echo ""
    echo "✨ All services started in background. Tailing logs below..."
    echo ""

    # Wait for all background jobs
    wait

# Start only the FastAPI backend API server (port 8000)
backend:
    PYTHONPATH=. .venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Start only the LangGraph agentic investigation worker (port 8080)
agent:
    PYTHONPATH=. .venv/bin/uvicorn agentic.main:app --host 127.0.0.1 --port 8080 --reload

# Start only the Next.js frontend web application (port 3000)
frontend:
    cd frontend && npm run dev

# Run the backend test suite with pytest
test:
    PYTHONPATH=. .venv/bin/pytest -v backend/tests/

# Run tests with code coverage report
test-cov:
    PYTHONPATH=. .venv/bin/pytest --cov=backend/app --cov=agentic/app backend/tests/

# Run end-to-end verification and seed flow
seed:
    PYTHONPATH=. .venv/bin/python scripts/verify_flow.py

# Run lint checks on backend, agentic, and frontend
lint:
    .venv/bin/ruff check backend/ agentic/
    cd frontend && npm run lint

# Format Python code with ruff
format:
    .venv/bin/ruff format backend/ agentic/

# Start all containerized services via Docker Compose
docker-up:
    docker compose up --build

# Stop all Docker Compose containers
docker-down:
    docker compose down

# Install all dependencies (virtualenv, python packages, frontend npm modules)
install:
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -e ./backend
    .venv/bin/pip install -e ./agentic
    .venv/bin/pip install email-validator
    cd frontend && npm install

# Clean caches and temporary build artifacts
clean:
    rm -rf .ruff_cache backend/.ruff_cache agentic/.ruff_cache
    rm -rf frontend/.next
    find . -type d -name "__pycache__" -exec rm -rf {} +
    find . -type d -name "*.egg-info" -exec rm -rf {} +
