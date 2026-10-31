FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml ./backend/
COPY agentic/pyproject.toml ./agentic/
RUN pip install --no-cache-dir ./backend ./agentic

COPY backend/ ./backend/
COPY agentic/ ./agentic/

EXPOSE 8080

CMD ["sh", "-c", "uvicorn agentic.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
