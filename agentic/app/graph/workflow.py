from agentic.app.graph.nodes import (
    deterministic_reconciliation_node,
    evidence_retrieval_node,
    human_in_the_loop_gate_node,
    intake_and_scope_node,
    llm_root_cause_analysis_node,
    resolution_proposal_node,
)
from agentic.app.graph.state import InvestigationState
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph


def create_investigation_graph():
    """Build and compile the stateful multi-step investigation LangGraph workflow."""
    workflow = StateGraph(InvestigationState)

    # Register Nodes
    workflow.add_node("intake_and_scope", intake_and_scope_node)
    workflow.add_node("evidence_retrieval", evidence_retrieval_node)
    workflow.add_node("deterministic_reconciliation", deterministic_reconciliation_node)
    workflow.add_node("llm_root_cause_analysis", llm_root_cause_analysis_node)
    workflow.add_node("resolution_proposal", resolution_proposal_node)
    workflow.add_node("human_in_the_loop_gate", human_in_the_loop_gate_node)

    # Define Linear & Conditional Flow
    workflow.add_edge(START, "intake_and_scope")
    workflow.add_edge("intake_and_scope", "evidence_retrieval")
    workflow.add_edge("evidence_retrieval", "deterministic_reconciliation")
    workflow.add_edge("deterministic_reconciliation", "llm_root_cause_analysis")
    workflow.add_edge("llm_root_cause_analysis", "resolution_proposal")
    workflow.add_edge("resolution_proposal", "human_in_the_loop_gate")
    workflow.add_edge("human_in_the_loop_gate", END)

    # In-memory checkpointer for state persistence & resumption
    checkpointer = MemorySaver()
    app = workflow.compile(checkpointer=checkpointer)
    return app

# Singleton compiled graph
investigation_graph = create_investigation_graph()
