# Faktry AI — Manufacturing Operations Agent Swarm

An enterprise AI Operations Swarm built specifically for **manufacturing businesses** to optimize plant operations, capture cost savings, save engineering & finance hours, and connect directly with **Google Sheets, Google Docs, ERP systems, and Slack**.

Powered by **Google Antigravity SDK (`google-antigravity`)**, **FastAPI**, **SQLAlchemy 2.0**, and **Next.js 14**.

## Key Capabilities

- **5 Specialized Manufacturing Swarm Agents**:
  - **BOMGuard (`BG-01`)**: Audits receiving dock scale slips vs POs and Bill-of-Materials (BOM) scrap/usage variances.
  - **CostSentry (`CS-02`)**: Performs 3-way PO, work order, and supplier invoice audits to stop price creep, duplicates, and unbilled production.
  - **LinePulse (`LP-03`)**: Keeps ERP production schedules in sync with shop-floor CNC / assembly machine cell runs.
  - **QualityShield (`QS-04`)**: Compiles verified inspection evidence for supplier Non-Conformance Reports (NCRs) and customer QA disputes.
  - **PlantBeacon (`PB-05`)**: Synthesizes plant-wide cost savings (`$`), reclaimed hours, work-cell benchmarks, and Google Docs/Sheets reports.
- **Drag & Drop Swarm Orchestrator**: Visually build custom pipelines connecting App Connectors, Swarm Agents, Approval Gates (`>=$500`), and automated outputs—executed via the Google Antigravity SDK DAG runner.
- **App Connectors Hub**: Connect **Google Sheets** (CSV/Sheet import & savings CSV export), **Google Docs** (executive ROI & NCR briefs), **Manufacturing ERP/SQL**, and **Slack Alerts** with SSRF validation and masked credentials.
- **Built-In "How It Works" Onboarding Page**: Plain-English interactive guide and safe dry-run swarm simulator for plant operators and managers.
- **Fail-Closed Google Antigravity Security Policies**: Tenant-scoped read-only data tools (`organization_id` bound server-side) with human-in-the-loop sign-off for high-value actions.

## Architecture Overview

```text
├── agentic/            # Google Antigravity SDK runtime, swarm DAG orchestrator, 5 mfg agents
├── backend/            # FastAPI REST API, SQLAlchemy models, workflows, connectors, exception detection
├── frontend/           # Next.js 14 App Router UI (Swarm Studio, Drag & Drop Builder, Connectors, Guide)
├── scripts/            # Local seeding and demo startup utilities
└── data/               # Local SQLite development database
```

## Quick Start

1. Configure `.env` (or copy `.env.example`) with your optional `GEMINI_API_KEY`. When offline or running in mock/dev mode, deterministic grounded fallbacks keep every workflow operational.
2. Start all services cleanly with Just:

```bash
just start
```

3. Open **http://localhost:3000** and sign in with the seeded plant manager account:
   - **Email**: `manager@apexmfg.com`
   - **Password**: `OperationsPass123!`

## Running Tests & Quality Checks

```bash
PYTHONPATH=. .venv/bin/python -m pytest -v backend/tests/
.venv/bin/ruff check backend/ agentic/
cd frontend && ./node_modules/.bin/tsc --noEmit && npm run build
```
