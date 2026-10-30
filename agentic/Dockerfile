FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY agentic/pyproject.toml ./
RUN pip install --no-cache-dir .

COPY agentic/ ./agentic/
COPY backend/app/core ./backend/app/core
COPY backend/app/db/models ./backend/app/db/models
COPY backend/app/db/base.py ./backend/app/db/base.py

EXPOSE 8080

CMD ["uvicorn", "agentic.main:app", "--host", "0.0.0.0", "--port", "8080"]
