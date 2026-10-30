# AI Operations Exception Agent for Industrial Services

An enterprise AI operations assistant engineered for waste management, recycling, and industrial field-service companies to identify, cross-reconcile, and investigate discrepancies across operational records.

Built with **FastAPI**, **SQLAlchemy 2.0**, **LangGraph**, **Vertex AI Gemini**, and **Next.js 14**.

---

## Key Capabilities

- **Deterministic Cross-Record Reconciliation**: Detects billing mismatches, certified scale weight discrepancies, unbilled completed hauls, dispatch schedule divergences, and duplicate customer billings.
- **Stateful LangGraph Agent Investigations**: Multi-step grounded reasoning agent that analyzes root causes, checks mathematical variance, and formulates evidence-backed resolution proposals.
- **Strict Zero-Hallucination Evidence Grounding**: Every finding cites verified database records and uploaded documents with exact excerpts and relevance explanations.
- **Human-in-the-Loop Decision Gate**: Enforces mandatory manager sign-off on recommended credit memos, re-billings, and dispatch adjustments. The agent never takes autonomous financial action.
- **High-Density Operations Dashboard**: Next.js App Router frontend with real-time triage, side-by-side record comparison, and CSV/PDF ingestion previewers.
- **Multi-Tenant Isolation**: Strict organization scoping at the database query, storage, and agent tool levels.

---

## System Architecture

```
operations-agent/
├── backend/            # FastAPI REST API, SQLAlchemy models, Ingestion & Detection engines
├── agentic/            # LangGraph workflow, Gemini Vertex AI adapters, state checkpointer
├── frontend/           # Next.js 14 App Router, TypeScript, Tailwind CSS dashboard
├── infrastructure/     # Terraform modules for Cloud Run, Cloud SQL, and Cloud Storage
├── docs/               # Architecture, API reference, Security, and Deployment guides
├── docker-compose.yml  # Local multi-service container orchestration
└── README.md
```

---

## Quick Start

### 1. Run All Services with Just (Recommended)
Start all three services (FastAPI Backend, Agentic Worker, and Next.js Frontend) concurrently with a single command:
```bash
# Start all services concurrently
just
# (or 'just start', 'just up', 'just dev')
```
Access the application:
- **Operations Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Agentic Worker Docs**: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)
- **Default Account**: `manager@apexwaste.com` / `OperationsPass123!`

Other handy `just` recipes:
- `just seed` / `just verify` — Runs end-to-end reconciliation and agent investigation
- `just test` — Runs full backend pytest suite
- `just lint` — Runs ruff and ESLint
- `just docker-up` — Starts containerized stack with PostgreSQL

### 2. Run with Docker Compose
```bash
docker-compose up --build
```

---

## Verification & Test Suite

Run the automated backend test suite covering tenant isolation, CSV parsing, rule evaluations, and LangGraph agent runs:
```bash
PYTHONPATH=. pytest -v backend/tests/
```

Verify frontend production compilation:
```bash
cd frontend && npm run build
```

---

## Documentation

- [Architecture & Specifications](docs/architecture.md)
- [Local Development Guide](docs/local-development.md)
- [Google Cloud Deployment](docs/deployment.md)
- [Security & Multi-Tenant Isolation](docs/security.md)
- [REST API Reference](docs/api.md)
- [Agent Grounding Benchmark & Evaluation](docs/agent-evaluations.md)

---

## License
Apache-2.0
