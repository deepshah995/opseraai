import logging
from typing import Any

from agentic.app.swarm.sdk_runtime import execute_swarm_workflow_dag
from agentic.app.swarm.state import InvestigationState
from agentic.app.swarm.workflow import investigation_swarm
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("antigravity_worker")

app = FastAPI(
    title="Manufacturing Operations Swarm Worker (Google Antigravity SDK)",
    version="2.0.0",
    description="Multi-agent manufacturing operations swarm powered by Google Antigravity SDK",
)


class InvestigateRequest(BaseModel):
    organization_id: str
    exception_id: str
    exception_data: dict[str, Any]
    records: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    user_notes: str | None = None


class SwarmExecuteRequest(BaseModel):
    organization_id: str
    workflow_name: str
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    records: list[dict[str, Any]] = []
    exceptions: list[dict[str, Any]] = []
    connectors: list[dict[str, Any]] = []
    dry_run: bool = False


@app.get("/healthz")
def health():
    return {
        "status": "healthy",
        "service": "antigravity-manufacturing-swarm-worker",
        "sdk": "google-antigravity",
    }


@app.post("/investigate")
def run_investigation_task(req: InvestigateRequest):
    logger.info(
        f"Received Antigravity investigation task for exception {req.exception_id} "
        f"(org: {req.organization_id})"
    )

    initial_state: InvestigationState = {
        "organization_id": req.organization_id,
        "exception_id": req.exception_id,
        "exception_data": req.exception_data,
        "records": req.records,
        "documents": req.documents,
        "reconciliation_math": {},
        "grounded_evidence": [],
        "root_cause_analysis": "",
        "proposed_resolution": None,
        "confidence": 0.0,
        "requires_human_approval": False,
        "status": "queued",
        "step_history": [],
        "cost_savings_usd": 0.0,
        "time_saved_minutes": 0.0,
        "sdk_metadata": {},
        "error": None,
    }

    try:
        final_state = investigation_swarm.invoke(initial_state)
        return {"status": "success", "final_state": final_state}
    except Exception as e:
        logger.error(f"Investigation execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Antigravity swarm workflow failed: {e!s}",
        )


@app.post("/swarm/execute")
def run_swarm_workflow(req: SwarmExecuteRequest):
    try:
        return execute_swarm_workflow_dag(
            workflow_name=req.workflow_name,
            nodes=req.nodes,
            edges=req.edges,
            org_records=req.records,
            org_exceptions=req.exceptions,
            connectors=req.connectors,
            dry_run=req.dry_run,
        )
    except Exception as e:
        logger.error(f"Swarm DAG execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Swarm DAG failed: {e!s}",
        )
