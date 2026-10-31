FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml ./backend/
COPY agentic/pyproject.toml ./agentic/
RUN pip install --no-cache-dir ./backend ./agentic

COPY backend/ ./backend/
COPY agentic/ ./agentic/
COPY data/ ./data/
RUN mkdir -p /app/data/storage

# Default SQLite database configuration for self-contained Cloud Run demo
ENV DATABASE_URL=sqlite:////app/data/ops_agent.db \
    STORAGE_BACKEND=local \
    LOCAL_STORAGE_DIR=/app/data/storage \
    PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
