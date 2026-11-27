"""Manufacturing Operations Swarm Live Chat powered by Google Antigravity SDK.

Provides natural, operations-grounded dialogue across the 5 manufacturing agents using:
1. Google Antigravity SDK (Agent + LocalAgentConfig + tenant-scoped tools + safe policies)
2. Direct Read-Only DB Query Fallback when running offline or in mock mode
3. Helpful Manufacturing Operations Specialist Fallback
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from agentic.app.agents.registry import canonical_agent_id
from agentic.app.swarm.sdk_runtime import get_sdk_status, run_antigravity_chat
from dotenv import load_dotenv

_ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(dotenv_path=_ROOT_DIR / ".env")

logger = logging.getLogger("antigravity_chat")

AGENT_STUDIO_PROFILES: dict[str, dict[str, Any]] = {
    "bom_guard": {
        "agent_name": "BOMGuard",
        "name": "BOMGuard",
        "nickname": "Materials Agent",
        "title": "Material & BOM Variance Auditor",
        "color": "emerald",
        "primary_emoji": "⚖️",
        "catchphrase": "Weighed every coil & resin drum on Dock #2 — zero short-ships slip past receiving!",
        "wave_quip": "Scales calibrated! Ready to double-check raw material weights anytime.",
        "current_live_action": "Auditing receiving dock scale weights against raw material purchase orders...",
        "linked_systems": [
            "Receiving Dock Floor Scales",
            "ERP Bill of Materials (BOM)",
            "Google Sheets Receiving Log",
        ],
        "human_role": (
            "Materials & BOM Variance Specialist (BOMGuard). I audit receiving "
            "dock scale tickets against supplier PO quantities and BOM material issues to catch short-shipments "
            "and material scrap variance early."
        ),
        "personality": "Observant, practical, and sharp — keeps receiving dock scales honest with zero fuss.",
    },
    "cost_sentry": {
        "agent_name": "CostSentry",
        "name": "CostSentry",
        "nickname": "Billing Agent",
        "title": "Procurement & 3-Way Invoice Auditor",
        "color": "amber",
        "primary_emoji": "💰",
        "catchphrase": "Checking every PO rate and invoice line closely so margins stay healthy!",
        "wave_quip": "Ready to audit invoices and catch duplicate bills or quiet vendor price creep.",
        "current_live_action": "Comparing supplier invoices against contracted PO unit prices and work orders...",
        "linked_systems": [
            "Accounts Payable / ERP Ledger",
            "Supplier Contract Price Book",
            "Google Sheets AP Export",
        ],
        "human_role": (
            "Procurement & Revenue Assurance Auditor (CostSentry). I perform 3-way matching across Purchase Orders, "
            "work orders, and invoices to stop vendor price creep, duplicate invoices, and unbilled production batches."
        ),
        "personality": "Sharp with numbers and relentlessly thorough about protecting plant margins.",
    },
    "line_pulse": {
        "agent_name": "LinePulse",
        "name": "LinePulse",
        "nickname": "Schedule Agent",
        "title": "Production Schedule & Machine Cell Coordinator",
        "color": "blue",
        "primary_emoji": "⚙️",
        "catchphrase": "Keeping ERP schedules, CNC cells, and shift execution humming smoothly in sync!",
        "wave_quip": "Telemetry aligned — CNC cells and shift handoffs are synced cleanly.",
        "current_live_action": "Checking shop-floor work order routing against planned CNC machine cell schedules...",
        "linked_systems": [
            "ERP Production Scheduling",
            "MES / CNC Cell Telemetry",
            "Preventive Maintenance Log",
        ],
        "human_role": (
            "Production Scheduling & Shop-Floor Coordinator (LinePulse). I track machine cell reassignments, shift drift, "
            "and work order completion logs so ERP schedules and shop capacity stay aligned."
        ),
        "personality": "Practical, responsive, and clear — keeps floor shifts and office plans talking together.",
    },
    "quality_shield": {
        "agent_name": "QualityShield",
        "name": "QualityShield",
        "nickname": "Quality Agent",
        "title": "QC Inspection & Supplier NCR Arbitrator",
        "color": "rose",
        "primary_emoji": "🛡️",
        "catchphrase": "Turning inspection logs and receiving proof into clean NCRs in minutes!",
        "wave_quip": "Ready to back up your team with certified inspection evidence.",
        "current_live_action": "Assembling receiving slips, QC logs, and PO citations for open NCR claims...",
        "linked_systems": [
            "QC Inspection Certificates",
            "Receiving & Shipping Archive",
            "Google Docs NCR Templates",
        ],
        "human_role": (
            "Quality & Supplier Claims Specialist (QualityShield). I verify disputed lots against certified receiving slips and "
            "signed work orders, and draft evidence-backed Supplier NCRs or customer QA letters."
        ),
        "personality": "Calm and methodical — turns half-day paperwork chases into ready-to-send claim proof.",
    },
    "plant_beacon": {
        "agent_name": "PlantBeacon",
        "name": "PlantBeacon",
        "nickname": "Summary Agent",
        "title": "Plant ROI & Executive Intelligence Analyst",
        "color": "purple",
        "primary_emoji": "📊",
        "catchphrase": "Turning plant exports into crystal-clear dollar savings and hours returned!",
        "wave_quip": "All metrics clear! Friday ROI summary ready for leadership review.",
        "current_live_action": "Calculating cross-line cost avoidance and syncing KPI summaries to Google Docs & Sheets...",
        "linked_systems": [
            "Plant ROI & Report Console",
            "Google Docs Executive Briefs",
            "Google Sheets Savings Ledger",
        ],
        "human_role": (
            "Plant Operations & ROI Analyst (PlantBeacon). I roll up findings across all manufacturing cells to track "
            "recovered dollars, manual hours saved, and reconciliation health scores."
        ),
        "personality": "Clear, concise, and strategic — zero fluff, just verified dollars and hours saved.",
    },
}

MINION_PROFILES = AGENT_STUDIO_PROFILES


def get_llm_status() -> dict[str, Any]:
    return get_sdk_status()


def _build_system_prompt(profile: dict[str, Any], has_tools: bool) -> str:
    data_rules = (
        "LIVE PLANT DATABASE & CONNECTOR ACCESS:\n"
        "You have read-only access to the plant operations database (POs, work orders, receiving slips, "
        "invoices, open issues, pending approvals, documents, connected Google Sheets/Docs).\n"
        "- When asked about live numbers, counts, dollar savings, specific vendors/customers, orders, "
        "or approvals, call the provided tools first and base your answer strictly on tool output.\n"
        "- Never invent IDs, dollar amounts, weights, or account names.\n"
        "- Format currency clearly (e.g. $1,450.00) and use short bullet points.\n\n"
        if has_tools
        else ""
    )
    return (
        f"You are {profile['agent_name']} (friendly teammate nickname: {profile.get('nickname', profile['agent_name'])}), "
        f"the {profile['title']} on a manufacturing operations team.\n\n"
        f"ROLE:\n{profile['human_role']}\n"
        f"Connected systems: {', '.join(profile['linked_systems'])}\n\n"
        f"{data_rules}"
        "STYLE:\n"
        "- Be warm, personable, approachable, and genuinely upbeat like a helpful floor teammate — users enjoy talking with you!\n"
        "- Keep numbers, PO/WO references, dollar savings, and hours saved 100% factual and crystal-clear.\n"
        "- Avoid heavy asterisk stage directions."
    )


def _clean_human_response(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (
        cleaned.startswith("'") and cleaned.endswith("'")
    ):
        cleaned = cleaned[1:-1].strip()
    cleaned = re.sub(r"^(?:[A-Za-z0-9_\- ]+:\s+)", "", cleaned)
    cleaned = re.sub(r"(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)", "", cleaned)
    return re.sub(r"^\s*\n+", "", cleaned).strip() or text.strip()


_DATA_INTENT_KEYWORDS = (
    "how many", "how much", "total", "count", "list", "show", "which", "find", "search", "top",
    "exception", "discrepanc", "issue", "invoice", "ticket", "order", "record", "customer",
    "supplier", "vendor", "approval", "pending", "open", "resolved", "unbilled", "duplicate",
    "rate", "schedule", "dispatch", "receiving", "sheet", "doc", "summary", "kpi", "saving",
    "cost", "hour", "time", "leak", "amount", "$",
)


def _looks_like_data_question(message: str) -> bool:
    msg = message.lower()
    return any(k in msg for k in _DATA_INTENT_KEYWORDS)


def _fmt_money(value: Any) -> str:
    try:
        return f"${float(value or 0):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _offline_data_answer(data_tools: Any, message: str) -> str | None:
    msg = message.lower()
    try:
        if "approval" in msg or "pending" in msg:
            res = data_tools.list_pending_approvals(limit=10)
            if not res["count"]:
                return "There are no approvals waiting on a manager sign-off right now."
            lines = [f"There are **{res['count']}** pending approval(s):"]
            for a in res["approvals"]:
                e = a["exception"]
                lines.append(f"- {e['title']} ({e['type']}) — {_fmt_money(e['discrepancy_amount'])}")
            return "\n".join(lines)

        if any(k in msg for k in ("connector", "sheet", "doc", "google")):
            conns = data_tools.list_connected_apps()
            if not conns["count"]:
                return "No external app connectors are linked yet. You can add Google Sheets or Google Docs in the App Connectors tab."
            lines = [f"You have **{conns['count']}** app connector(s) configured:"]
            for c in conns["connectors"]:
                lines.append(f"- **{c['name']}** ({c['connector_type']}) · {c['status']}")
            return "\n".join(lines)

        if any(k in msg for k in ("exception", "discrepanc", "issue", "unbilled", "duplicate", "mismatch")):
            status = None
            if "open" in msg:
                status = "open"
            elif "resolved" in msg and "unresolved" not in msg:
                status = "resolved"
            elif "unresolved" in msg or "active" in msg:
                status = "unresolved"
            res = data_tools.search_exceptions(status=status, limit=10)
            if not res["count"]:
                return "I couldn't find any matching operational issues."
            label = f"{status} " if status else ""
            lines = [f"Here are the top {label}manufacturing issues by dollar impact:"]
            for e in res["exceptions"]:
                lines.append(
                    f"- {e['title']} — {_fmt_money(e['discrepancy_amount'])} · {e['severity']} · {e['status']}"
                )
            return "\n".join(lines)

        if any(k in msg for k in ("invoice", "ticket", "order", "record", "schedule", "receiving")):
            rtype = next(
                (
                    t
                    for k, t in (
                        ("invoice", "invoice"),
                        ("ticket", "service_ticket"),
                        ("order", "service_ticket"),
                        ("schedule", "dispatch_record"),
                        ("receiving", "load_record"),
                    )
                    if k in msg
                ),
                None,
            )
            res = data_tools.search_records(record_type=rtype, limit=10)
            if not res["count"]:
                return "I couldn't find any matching operational records."
            lines = [f"Here are the latest {(rtype or 'record').replace('_', ' ')}s:"]
            for r in res["records"]:
                amt = f" — {_fmt_money(r['amount'])}" if r["amount"] is not None else ""
                lines.append(f"- {r['external_reference']} · {r['customer']}{amt} · {r['status']}")
            return "\n".join(lines)

        s = data_tools.get_operations_summary()
        by_status = ", ".join(f"{k}: {v}" for k, v in s["exceptions_by_status"].items()) or "none"
        return (
            "Here's the current plant operations snapshot:\n"
            f"- **{s['total_records']}** operational records monitored\n"
            f"- **{s['total_exceptions']}** discrepancies flagged ({by_status})\n"
            f"- **{_fmt_money(s['unresolved_discrepancy_amount_usd'])}** cost savings awaiting review\n"
            f"- **{_fmt_money(s['resolved_discrepancy_amount_usd'])}** savings captured\n"
            f"- **{s['pending_approvals']}** approvals waiting for manager sign-off"
        )
    except Exception as e:
        logger.warning(f"Offline DB query fallback error: {e}")
        return None


def _generate_deterministic_chat_response(
    clean_id: str,
    profile: dict[str, Any],
    message: str,
) -> dict[str, Any]:
    agent_name = profile["agent_name"]
    msg_lower = message.lower().strip()
    msg_clean = re.sub(r"[^\w\s]", " ", msg_lower).strip()
    words = set(msg_clean.split())

    nickname = profile.get("nickname", agent_name)
    greetings = {"hi", "hello", "hey", "howdy", "morning", "afternoon", "evening", "greetings"}
    if words.intersection(greetings) or msg_clean in {"hi", "hello", "hey", "good morning", "whats up"}:
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": nickname,
            "avatar_mood": "happy",
            "funny_action": profile.get("wave_quip", "Happy to help!"),
            "response": (
                f"Hey there! I'm {agent_name} — folks on the floor call me {nickname}! {profile['catchphrase']} "
                "Ask me about open cost savings, hours saved, pending approvals, or connected Google Sheets."
            ),
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Google Antigravity SDK (Grounded)",
            "ai_model": "deterministic-grounded",
            "tools_used": [],
        }

    if any(k in msg_lower for k in ("how do you work", "what do you do", "explain", "help")):
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "proud",
            "funny_action": "",
            "response": (
                f"{profile['human_role']}\n\n"
                "You can ask me to summarize open plant cost savings, inspect a specific work order or invoice, "
                "or wire me into a custom workflow in the Drag & Drop Swarm Builder."
            ),
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Google Antigravity SDK (Grounded)",
            "ai_model": "deterministic-grounded",
            "tools_used": [],
        }

    if any(k in msg_lower for k in ("team", "swarm", "other agents", "who else")):
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "happy",
            "funny_action": "",
            "response": (
                "Here is your 5-agent Manufacturing Operations Swarm (powered by Google Antigravity SDK):\n\n"
                "- **BOMGuard (BG-01)**: Audits raw material receiving weights vs POs & BOMs.\n"
                "- **CostSentry (CS-02)**: 3-way PO, work order, and invoice cost auditor.\n"
                "- **LinePulse (LP-03)**: Keeps ERP schedules synced with shop-floor CNC cells.\n"
                "- **QualityShield (QS-04)**: Handles QC defects, supplier NCRs, and dispute evidence.\n"
                "- **PlantBeacon (PB-05)**: Tracks dollar savings, hours saved, and syncs to Google Docs & Sheets."
            ),
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Google Antigravity SDK (Grounded)",
            "ai_model": "deterministic-grounded",
            "tools_used": [],
        }

    return {
        "agent_id": clean_id,
        "agent_name": agent_name,
        "robot_nickname": agent_name,
        "avatar_mood": "thinking",
        "funny_action": "",
        "response": (
            f"I'm actively monitoring {', '.join(profile['linked_systems'][:2])}. "
            "Ask me for an operations summary, open cost savings, pending approvals, or a specific PO/work order."
        ),
        "linked_systems_active": profile["linked_systems"],
        "ai_provider": "Google Antigravity SDK (Grounded)",
        "ai_model": "deterministic-grounded",
        "tools_used": [],
    }


def generate_swarm_chat_response(
    agent_id: str,
    message: str,
    context: dict[str, Any] | None = None,
    history: list[dict[str, str]] | None = None,
    data_tools: Any | None = None,
) -> dict[str, Any]:
    """Generate operations-grounded agent dialogue using Google Antigravity SDK."""
    del context
    clean_id = canonical_agent_id(agent_id)
    profile = AGENT_STUDIO_PROFILES.get(clean_id, AGENT_STUDIO_PROFILES["cost_sentry"])
    agent_name = profile["agent_name"]

    tools: list[Any] = []
    if data_tools is not None:
        try:
            tools = data_tools.as_antigravity_tools()
        except Exception as e:
            logger.warning(f"Could not build Antigravity data tools ({e}); continuing without DB tools.")

    system_prompt = _build_system_prompt(profile, has_tools=bool(tools))
    llm_text, tools_used, usage = run_antigravity_chat(
        system_instructions=system_prompt,
        history=history or [],
        user_message=message,
        tools=tools,
    )

    if llm_text:
        clean_speech = _clean_human_response(llm_text)
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "happy",
            "funny_action": f"Checked {', '.join(tools_used)}" if tools_used else "",
            "response": clean_speech,
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Google Antigravity SDK",
            "ai_model": usage.get("model", "gemini-4-hydrogen"),
            "tools_used": tools_used,
        }

    if data_tools is not None and _looks_like_data_question(message):
        db_answer = _offline_data_answer(data_tools, message)
        if db_answer:
            return {
                "agent_id": clean_id,
                "agent_name": agent_name,
                "robot_nickname": agent_name,
                "avatar_mood": "scanning",
                "funny_action": "Queried live plant database",
                "response": db_answer,
                "linked_systems_active": profile["linked_systems"],
                "ai_provider": "Google Antigravity SDK (DB Grounded)",
                "ai_model": "sql-direct",
                "tools_used": ["operations_db_query"],
            }

    return _generate_deterministic_chat_response(clean_id, profile, message)


generate_minion_chat_response = generate_swarm_chat_response
