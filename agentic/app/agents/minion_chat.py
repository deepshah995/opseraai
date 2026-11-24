"""Compatibility re-exports for legacy imports; powered by Google Antigravity SDK."""

from agentic.app.agents.swarm_chat import (
    AGENT_STUDIO_PROFILES,
    MINION_PROFILES,
    generate_minion_chat_response,
    generate_swarm_chat_response,
    get_llm_status,
)

__all__ = [
    "AGENT_STUDIO_PROFILES",
    "MINION_PROFILES",
    "generate_minion_chat_response",
    "generate_swarm_chat_response",
    "get_llm_status",
]
