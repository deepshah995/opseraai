import logging
from typing import Any

from agentic.app.graph.state import InvestigationState
from agentic.app.graph.workflow import investigation_graph
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agentic_worker")

app = FastAPI(
    title="Operations Agentic Investigation Worker",
    version="1.0.0",
    description="Stateful LangGraph + Vertex AI Gemini multi-step investigation service",
)

class InvestigateRequest(BaseModel):
    organization_id: str
    exception_id: str
    exception_data: dict[str, Any]
    records: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    user_notes: str | None = None

@app.get("/healthz")
def health():
    return {"status": "healthy", "service": "agentic-investigation-worker"}

@app.post("/investigate")
def run_investigation_task(req: InvestigateRequest):
    logger.info(f"Received investigation task for exception {req.exception_id} (org: {req.organization_id})")
    
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
        "error": None,
    }

    try:
        thread_config = {"configurable": {"thread_id": f"task_{req.exception_id}"}}
        final_state = investigation_graph.invoke(initial_state, config=thread_config)
        return {
            "status": "success",
            "final_state": final_state,
        }
    except Exception as e:
        logger.error(f"Investigation execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent workflow failed: {e!s}",
        )
