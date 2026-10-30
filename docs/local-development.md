# Local Development Guide

## Prerequisites
- Python 3.11+
- Node.js 18+ or 20+
- Docker & Docker Compose (optional for full containerized stack)

---

## 1. Quick Start (Using Just)

The easiest way to start all services concurrently is using `just`:
```bash
# Start Backend API (8000), Agentic Worker (8080), and Frontend (3000)
just
# (or 'just start')
```

### Available `just` Commands:
| Command | Description |
|---|---|
| `just` or `just start` | Starts all 3 services concurrently with live logs and clean Ctrl+C shutdown |
| `just backend` | Starts only the FastAPI Backend server on `http://127.0.0.1:8000` |
| `just agent` | Starts only the LangGraph Agentic Investigation worker on `http://127.0.0.1:8080` |
| `just frontend` | Starts only the Next.js Frontend Dashboard on `http://localhost:3000` |
| `just test` | Runs the full backend test suite (`pytest -v backend/tests/`) |
| `just seed` | Runs the full verification flow and seeds demo operational exceptions |
| `just lint` | Runs ruff on Python services and ESLint on the Next.js app |
| `just format` | Automatically formats Python code with ruff |
| `just docker-up` | Starts the containerized stack with PostgreSQL |
| `just clean` | Removes caches, `.next`, and temporary build artifacts |

---

## 2. Manual Standalone Setup

### Backend Service
```bash
# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -e ./backend
pip install -e ./agentic
pip install email-validator

# 3. Start Backend API Server
PYTHONPATH=. uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes SQLite database at `data/ops_agent.db` and seeds the default tenant and demo user:
- Email: `manager@apexwaste.com`
- Password: `OperationsPass123!`

### Frontend Service
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Docker Compose (Full Stack)

To run the complete production-like stack with PostgreSQL:
```bash
docker-compose up --build
```
Services exposed:
- Frontend Dashboard: [http://localhost:3000](http://localhost:3000)
- Backend REST API: [http://localhost:8000](http://localhost:8000)
- Swagger OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Agentic Investigation Worker: [http://localhost:8080](http://localhost:8080)
- PostgreSQL Database: `localhost:5432` (user: `ops_user`, pass: `ops_password_local`)

---

## 3. Running Test Suites

Run the test suite verifying multi-tenant isolation, CSV parsing, exception detection rules, and LangGraph investigations:
```bash
PYTHONPATH=. pytest -v backend/tests/
```
Run frontend production build verification:
```bash
cd frontend && npm run build
```
