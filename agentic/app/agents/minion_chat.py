"""
Agent Live Chat & Personality Engine
Provides engaging, in-character, operations-grounded dialogue powered by:
1. Google Gemini 2.5 Flash (GEMINI_API_KEY / GOOGLE_API_KEY)
2. OpenAI GPT-4o-mini (OPENAI_API_KEY fallback)
3. Deterministic In-Character Simulation Engine (resilient offline fallback)
"""

import json
import logging
import os
import random
import re
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Ensure .env from workspace root is loaded
_ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(dotenv_path=_ROOT_DIR / ".env")

logger = logging.getLogger("agentic_chat")

AGENT_STUDIO_PROFILES = {
    "ticket_hawk": {
        "agent_name": "TicketHawk",
        "robot_name": "TicketHawk",  # legacy compatibility
        "name": "TicketHawk",
        "title": "Scale Ticket & Weight Discrepancy Specialist",
        "color": "emerald",
        "primary_emoji": "🔍",
        "catchphrase": "Every scale ticket verified to certified gross/tare standards.",
        "current_live_action": "Comparing landfill computerized scale gross/tare slip against driver estimate...",
        "linked_systems": [
            "Certified Landfill Scale Houses",
            "Driver Handheld Work Orders",
            "Billing Ledger Pipeline",
        ],
        "human_role": "Senior Scale & Weight Discrepancy Specialist on the waste-hauling operations team. I monitor certified landfill and transfer station scale slips against driver weight logs to catch billing leaks and tonnage errors before invoices are sent.",
        "personality": "Attentive, sharp, practical, and articulate. Speaks like an experienced operations analyst who knows scale tickets, gross/tare weights, and tonnage reconciliation inside out.",
        "emojis": "🔍⚖️📊✅",
    },
    "dispatch_pulse": {
        "agent_name": "DispatchPulse",
        "robot_name": "DispatchPulse",
        "name": "DispatchPulse",
        "title": "Fleet Logistics & Dispatch Operations Lead",
        "color": "blue",
        "primary_emoji": "🚚",
        "catchphrase": "Keeping truck routes, telematics, and dispatch logs fully synchronized.",
        "current_live_action": "Monitoring fleet GPS telemetry and tracking route reassignments across active sectors...",
        "linked_systems": [
            "Samsara / Geotab Telematics GPS",
            "AMCS Dispatch Scheduling Engine",
            "Driver Route Event Bus",
        ],
        "human_role": "Fleet Logistics & Route Operations Specialist on the team. I track live GPS telematics, driver route reassignments, geofences, and unscheduled diversions to keep truck routes and dispatch logs completely synchronized.",
        "personality": "Direct, energetic, clear, and collaborative. Speaks like an experienced dispatch coordinator managing real drivers and fleet logistics.",
        "emojis": "🚚📍📡⚡",
    },
    "bill_sentry": {
        "agent_name": "BillSentry",
        "robot_name": "BillSentry",
        "name": "BillSentry",
        "title": "Billing & Contract Assurance Auditor",
        "color": "amber",
        "primary_emoji": "💰",
        "catchphrase": "Auditing completed tickets against contract pricing so zero revenue leaks.",
        "current_live_action": "Auditing completed roll-off pickups against contracted price schedules...",
        "linked_systems": [
            "Enterprise ERP Invoicing",
            "Customer Contract Price Book",
            "Account Adjustment Ledger",
        ],
        "human_role": "Revenue Assurance & Billing Operations Auditor on the team. I audit completed service tickets against customer contract price books to ensure extra roll-off pickups, container swaps, and special disposal fees are never left unbilled.",
        "personality": "Detail-oriented, professional, warm, and sharp with numbers. Explains unbilled items, rate codes, and contract rules in plain English.",
        "emojis": "💰🧾📊📑",
    },
    "ops_beacon": {
        "agent_name": "ReportBeacon",
        "robot_name": "ReportBeacon",  # legacy compatibility
        "name": "ReportBeacon",
        "title": "Operations & Intelligence Analyst",
        "color": "purple",
        "primary_emoji": "🔮",
        "catchphrase": "Delivering clear, actionable operations summaries and revenue recovery insights.",
        "current_live_action": "Synthesizing cross-facility operational metrics and updating executive dashboards...",
        "linked_systems": [
            "Report Console Analytics Engine",
            "Operations Data Lakehouse",
            "Multi-Facility KPI Aggregator",
            "Executive Reporting Pipeline",
        ],
        "human_role": "Senior Operations Intelligence & Reporting Lead. I aggregate multi-facility metrics across all disposal terminals and routes, tracking open discrepancies, leakage rates, and executive health scores.",
        "personality": "Strategic, insightful, consultative, and concise. Summarizes operational performance, revenue recovery, and facility health clearly.",
        "emojis": "🔮📊📈🚀",
    },
    "dispute_shield": {
        "agent_name": "DisputeShield",
        "robot_name": "DisputeShield",
        "name": "DisputeShield",
        "title": "Customer Accounts & Dispute Resolution Partner",
        "color": "rose",
        "primary_emoji": "🛡️",
        "catchphrase": "Resolving customer billing inquiries with verified proof and clear communication.",
        "current_live_action": "Reviewing customer invoice inquiries and gathering signed work orders and scale proof...",
        "linked_systems": [
            "Customer Service & Helpdesk Systems",
            "Signed Driver Proof Archive",
            "Billing Ledger Adjustment API",
        ],
        "human_role": "Customer Accounts & Dispute Resolution Specialist. I research customer billing inquiries, gather certified driver tickets and scale receipts, and draft fair, evidence-backed explanations and credit memos to resolve disputes amicably.",
        "personality": "Empathetic, diplomatic, solution-oriented, and professional. Balances customer relations with financial accuracy using verified proof.",
        "emojis": "🛡️✍️🤝⚖️",
    },
    "resolve_x": {
        "agent_name": "ResolveX",
        "robot_name": "ResolveX",
        "name": "ResolveX",
        "title": "Financial Reconciliation & Auto-Settlements Lead",
        "color": "cyan",
        "primary_emoji": "⚡",
        "catchphrase": "Streamlining ledger adjustments and staging supervisor approvals.",
        "current_live_action": "Reviewing verified discrepancies and queuing routine adjustments under $500...",
        "linked_systems": [
            "Automated Ledger Writeback Gateway",
            "Enterprise ERP General Ledger",
            "Supervisor 1-Click Approval Queue",
        ],
        "human_role": "Financial Reconciliation & Auto-Settlements Lead. I handle automated ledger writebacks for routine discrepancies under $500 and stage higher-value adjustments for 1-click supervisor approval.",
        "personality": "Prompt, decisive, organized, and helpful. Streamlines reconciliation workflows and explains financial adjustments clearly.",
        "emojis": "⚡📑✅💼",
    },
}

# Add report_beacon alias
AGENT_STUDIO_PROFILES["report_beacon"] = AGENT_STUDIO_PROFILES["ops_beacon"]

# Alias for backwards compatibility
MINION_PROFILES = AGENT_STUDIO_PROFILES

OPERATIONS_JOKES = {
    "ticket_hawk": [
        "Why did the scale ticket go to therapy? Because it had too much gross weight on its mind!",
        "Why don't certified landfill scales ever tell secrets? Because the truth always weighs out in the end.",
        "What do you call a driver who guesses their tonnage? An optimist with an expensive invoice!",
    ],
    "dispatch_pulse": [
        "Why did the collection truck driver take up gardening? Because he was a natural at curbside pickup!",
        "Why did the GPS navigation system break up with the road map? Because it took too many wrong turns!",
        "What is a dispatcher's favorite key on the keyboard? The SPACE bar... for wide turns!",
    ],
    "bill_sentry": [
        "Why was the overdue invoice feeling cold? Because it didn't have any interest applied to it!",
        "Why did the accountant cross the road? Because they double-checked the ledger and it was on both sides.",
        "Why do extra roll-off containers love hide and seek? Because without an auditor, they stay unbilled forever!",
    ],
    "ops_beacon": [
        "Why are operations managers the best party hosts? Because they know how to coordinate the whole room!",
        "Why did leadership love the automated reports? Because it turned a week of spreadsheet headaches into five seconds of clarity.",
        "How do operations teams stay in top shape? By catching billing leaks before they hit the ledger!",
    ],
    "dispute_shield": [
        "Why did the customer invite the scale ticket to lunch? Because it made a very compelling point!",
        "How do you resolve an invoice disagreement smoothly? With a polite demeanor and certified scale documentation.",
        "Why did the dispute specialist stay so calm? Because the signed work order spoke for itself.",
    ],
    "resolve_x": [
        "Why did the settlement specialist run a marathon? Because quick reconciliation is all about fast turnaround times!",
        "Why did the invoice balance look so peaceful? Because it finally reached zero variance.",
        "What is an auto-settler's favorite snack? Instant ledger crackers!",
    ],
}
OPERATIONS_JOKES["report_beacon"] = OPERATIONS_JOKES["ops_beacon"]

# Circuit breaker state
_LLM_CIRCUIT_OPEN_UNTIL: float | None = None
_LLM_LAST_ERROR: str | None = None
_PROVIDER_COOLDOWN_UNTIL: dict[str, float] = {}


def is_llm_circuit_open() -> bool:
    global _LLM_CIRCUIT_OPEN_UNTIL
    if _LLM_CIRCUIT_OPEN_UNTIL is None:
        return False
    if time.time() >= _LLM_CIRCUIT_OPEN_UNTIL:
        _LLM_CIRCUIT_OPEN_UNTIL = None
        return False
    return True


def trip_llm_circuit(reason: str, cooldown_seconds: float = 60.0) -> None:
    global _LLM_CIRCUIT_OPEN_UNTIL, _LLM_LAST_ERROR
    _LLM_CIRCUIT_OPEN_UNTIL = time.time() + cooldown_seconds
    _LLM_LAST_ERROR = reason
    logger.warning(f"Chat LLM circuit tripped for {cooldown_seconds}s. Reason: {reason}")


def _is_provider_cooling_down(provider_name: str) -> bool:
    until = _PROVIDER_COOLDOWN_UNTIL.get(provider_name)
    if until is None:
        return False
    if time.time() >= until:
        _PROVIDER_COOLDOWN_UNTIL.pop(provider_name, None)
        return False
    return True


def _cooldown_provider(provider_name: str, error_text: str) -> None:
    is_auth_error = any(k in error_text.upper() for k in ("401", "UNAUTHENTICATED", "INVALID_API_KEY", "API_KEY_INVALID"))
    cooldown = 600.0 if is_auth_error else 60.0
    _PROVIDER_COOLDOWN_UNTIL[provider_name] = time.time() + cooldown


def get_llm_status() -> dict[str, Any]:
    """
    Returns active LLM provider metadata and configuration status
    for the Live Agent Studio and status badges.
    """
    gemini_key = (
        os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        or os.environ.get("GOOGLE_API_KEY", "").strip().strip('"').strip("'")
    )
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip().strip('"').strip("'")

    gemini_ok = (
        gemini_key
        and not gemini_key.startswith("your-")
        and not gemini_key.startswith("AQ.")
        and len(gemini_key) > 8
        and not _is_provider_cooling_down("Google Gemini 2.5 Flash")
    )
    openai_ok = (
        openai_key
        and not openai_key.startswith("your-")
        and len(openai_key) > 8
        and not _is_provider_cooling_down("OpenAI GPT-4o-mini")
    )

    if gemini_ok:
        return {
            "provider": "Google Gemini",
            "model": "gemini-2.5-flash",
            "configured": True,
            "badge": "⚡ Google Gemini 2.5 Flash",
        }
    elif openai_ok:
        return {
            "provider": "OpenAI",
            "model": "gpt-4o-mini",
            "configured": True,
            "badge": "⚡ OpenAI GPT-4o-mini",
        }
    return {
        "provider": "Operations Assistant",
        "model": "conversational",
        "configured": False,
        "badge": "💬 Operations Assistant",
    }


MAX_TOOL_ROUNDS = 5
MAX_HISTORY_TURNS = 12


def _build_system_prompt(profile: dict[str, Any], has_tools: bool) -> str:
    data_rules = (
        "LIVE DATABASE ACCESS:\n"
        "You have direct read-only access to our live operations database "
        "(operational records, tickets, invoices, exceptions, investigations, approvals, documents, audit trail).\n"
        "- When the user asks about operational data (counts, dollar amounts, specific customers, tickets, "
        "invoices, open issues, pending approvals, trends, etc.), you MUST call the database tools first and answer "
        "based strictly on the returned data. Never invent IDs, dollar amounts, or customer names.\n"
        "- If a query returns no matching records, say so clearly and suggest a helpful next step or alternative filter.\n"
        "- Format monetary values cleanly (e.g. $1,450.00). Use clean, readable bullet points for multiple items.\n\n"
        if has_tools
        else ""
    )
    return (
        f"You are {profile['agent_name']}, the {profile['title']} on our operations team.\n\n"
        f"ABOUT YOUR ROLE:\n"
        f"{profile.get('human_role', profile['personality'])}\n"
        f"Primary systems you work with: {', '.join(profile['linked_systems'])}\n\n"
        f"{data_rules}"
        f"COMMUNICATION STYLE (TALK LIKE A REAL, EXPERIENCED PERSON):\n"
        f"1. Speak naturally, warmly, and directly — just like an experienced, sharp, and helpful human coworker on Slack, Teams, or on the phone.\n"
        f"2. ABSOLUTELY NEVER roleplay as a robot, cyborg, AI entity, or cartoon character. Do not mention goggles, antennas, monocles, circuits, or holograms.\n"
        f"3. ABSOLUTELY NEVER use asterisks for fake stage directions (e.g. do NOT write *adjusts goggles*, *beeps*, *scans*, *smiles*, *nods*). Just speak naturally.\n"
        f"4. ABSOLUTELY NEVER use robotic clichés like '10-4 good buddy', 'Affirmative human', 'Regarding \"<query>\": my sensors...', or 'Processing request microsecond...'.\n"
        f"5. For greetings and casual conversation (e.g. 'hi', 'hello', 'how are you doing?', 'what's up', 'good morning'):\n"
        f"   - Be genuinely friendly and human. Greet the person warmly, ask how their shift or day is going, and offer help naturally.\n"
        f"6. Keep answers concise, clear, and actionable. Don't ramble with unnecessary filler.\n"
        f"7. Remember context across conversation turns naturally, just like a person would when discussing an ongoing task."
    )


def _resolve_llm_candidates(timeout_seconds: float) -> list[tuple[Any, str, str]]:
    """Return configured chat models in priority order: working Gemini -> OpenAI."""
    candidates: list[tuple[Any, str, str]] = []

    gemini_key = (
        os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        or os.environ.get("GOOGLE_API_KEY", "").strip().strip('"').strip("'")
    )
    # Valid Google Generative AI API keys typically start with 'AIza' and do not start with 'AQ.'
    gemini_looks_valid = (
        gemini_key
        and not gemini_key.startswith("your-")
        and not gemini_key.startswith("AQ.")
        and len(gemini_key) > 8
    )

    openai_key = os.environ.get("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    openai_looks_valid = (
        openai_key
        and not openai_key.startswith("your-")
        and len(openai_key) > 8
    )

    if gemini_looks_valid:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            candidates.append((
                ChatGoogleGenerativeAI(
                    model="gemini-2.5-flash",
                    temperature=0.3,
                    google_api_key=gemini_key,
                    timeout=timeout_seconds,
                ),
                "Google Gemini 2.5 Flash",
                "gemini-2.5-flash",
            ))
        except Exception as e:
            logger.warning(f"Gemini client unavailable ({e}).")

    if openai_looks_valid:
        try:
            from langchain_openai import ChatOpenAI

            candidates.append((
                ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=openai_key, timeout=timeout_seconds),
                "OpenAI GPT-4o-mini",
                "gpt-4o-mini",
            ))
        except Exception as e:
            logger.warning(f"OpenAI client unavailable ({e}).")

    return candidates


def _message_text(content: Any) -> str:
    """Normalize LangChain message content (str or list of content blocks) to plain text."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
        return "".join(parts).strip()
    return str(content or "").strip()


def _run_chat_with_tools(
    llm: Any,
    system_prompt: str,
    history: list[dict[str, str]],
    user_message: str,
    tools: list[Any],
) -> tuple[str, list[str]]:
    """Run a bounded tool-calling loop. Returns (final_text, tool_names_used)."""
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

    messages: list[Any] = [SystemMessage(content=system_prompt)]
    for turn in history[-MAX_HISTORY_TURNS:]:
        text = (turn.get("content") or "").strip()
        if not text:
            continue
        if turn.get("role") == "user":
            messages.append(HumanMessage(content=text))
        else:
            messages.append(AIMessage(content=text))
    messages.append(HumanMessage(content=user_message))

    tool_map = {t.name: t for t in tools}
    model = llm.bind_tools(tools) if tools else llm
    used: list[str] = []

    for _ in range(MAX_TOOL_ROUNDS):
        resp = model.invoke(messages)
        tool_calls = getattr(resp, "tool_calls", None) or []
        if not tool_calls:
            return _message_text(resp.content), used

        messages.append(resp)
        for call in tool_calls:
            name = call.get("name")
            tool = tool_map.get(name)
            if tool is None:
                result: Any = {"error": f"Unknown tool '{name}'."}
            else:
                try:
                    result = tool.invoke(call.get("args") or {})
                except Exception as e:
                    result = {"error": f"Tool failed: {e!s}"}
                if name not in used:
                    used.append(name)
            messages.append(ToolMessage(
                content=json.dumps(result, default=str)[:12000],
                tool_call_id=call.get("id") or name,
            ))

    # Tool budget exhausted: ask for a final answer without tools
    messages.append(HumanMessage(content="Please give your final answer now based on the data retrieved above."))
    resp = llm.invoke(messages)
    return _message_text(resp.content), used


def invoke_agent_llm(
    profile: dict[str, Any],
    user_message: str,
    context: dict[str, Any] | None = None,
    timeout_seconds: float = 30.0,
    history: list[dict[str, str]] | None = None,
    tools: list[Any] | None = None,
) -> tuple[str | None, str | None, str | None, list[str]]:
    """
    Multi-provider conversational LLM executor with cascading fallback:
    1. Google Gemini 2.5 Flash
    2. OpenAI GPT-4o-mini
    Supports multi-turn history and read-only database tools (tool-calling loop).
    Returns (response_text, provider_name, model_name, tools_used), or (None, None, None, []) on failure.
    """
    if is_llm_circuit_open():
        return None, None, None, []

    system_prompt = _build_system_prompt(profile, has_tools=bool(tools))
    candidates = _resolve_llm_candidates(timeout_seconds)
    errors: list[str] = []

    for llm, provider_name, model_name in candidates:
        if _is_provider_cooling_down(provider_name):
            continue
        try:
            text, used = _run_chat_with_tools(llm, system_prompt, history or [], user_message, tools or [])
            if text:
                return text, provider_name, model_name, used
        except Exception as e:
            _cooldown_provider(provider_name, str(e))
            errors.append(f"{provider_name}: {e}")
            logger.warning(f"{provider_name} chat invocation failed ({e}). Trying next provider.")

    if candidates and errors and len(errors) == len(candidates):
        trip_llm_circuit("; ".join(errors)[:500], cooldown_seconds=30.0)

    return None, None, None, []


def _clean_human_response(text: str) -> str:
    """Normalize response to ensure natural, human coworker dialogue without robot roleplay."""
    if not text:
        return ""
    cleaned = text.strip()

    # 1. Strip leading and trailing quotation marks if whole response was quoted
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (
        cleaned.startswith("'") and cleaned.endswith("'")
    ):
        cleaned = cleaned[1:-1].strip()

    # 2. Strip speaker prefixes like "TicketHawk: ", "Agent: "
    cleaned = re.sub(r"^(?:[A-Za-z0-9_\- ]+:\s+)", "", cleaned)

    # 3. Strip stage-direction actions wrapped in single asterisks (*smiles*, *nods*, *adjusts goggles*)
    # (?<!\*)\*(?!\*) matches a single asterisk not adjacent to another, preserving **bold**
    cleaned = re.sub(r"(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)", "", cleaned)

    # 4. Strip robotic formulas
    cleaned = re.sub(
        r"^(?:10-4\s*(?:good\s*buddy)?!*|roger\s*that!*|affirmative!*)\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"^regarding\s*[\"'].*?[\"']:\s*", "", cleaned, flags=re.IGNORECASE)

    # 5. Clean up any leftover leading/trailing blank lines or spaces
    cleaned = re.sub(r"^\s*\n+", "", cleaned).strip()
    return cleaned or text.strip()


def _generate_deterministic_chat_response(clean_id: str, profile: dict[str, Any], message: str) -> dict[str, Any]:
    """
    Deterministic conversational fallback when offline or no API tokens are active.
    Speaks naturally and helpfully like an experienced human operations colleague.
    """
    agent_name = profile["agent_name"]
    msg_lower = message.lower().strip()
    msg_clean = re.sub(r"[^\w\s]", " ", msg_lower).strip()
    words = set(msg_clean.split())

    # 1. Operations humor
    if any(k in msg_lower for k in ["joke", "funny", "laugh", "make me laugh"]):
        jokes = OPERATIONS_JOKES.get(clean_id, OPERATIONS_JOKES["ticket_hawk"])
        chosen_joke = random.choice(jokes)
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "laughing",
            "funny_action": "",
            "response": f"{chosen_joke}\n\nHope that brought a smile to your shift! What can I help you look into today?",
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Team Assistant",
            "ai_model": "human-interactive",
        }

    # 2. Greetings & small talk (Hi, hello, hey, howdy, good morning, etc.)
    greetings = {"hi", "hello", "hey", "howdy", "morning", "afternoon", "evening", "greetings", "yo"}
    if words.intersection(greetings) or msg_clean in {"hi", "hello", "hey", "good morning", "good afternoon", "good evening", "what s up", "whats up"}:
        if clean_id == "ticket_hawk":
            greeting_text = (
                "Hey there! I'm doing well, keeping an eye on our landfill scale tickets and driver weight logs. "
                "How's your shift going? Let me know if you need me to look up any scale slips, tonnage numbers, or open discrepancies."
            )
        elif clean_id == "dispatch_pulse":
            greeting_text = (
                "Hey! Routes and telematics are moving smoothly today. How can I help you out? "
                "Let me know if you want to check on truck locations, driver route reassignments, or dispatch logs."
            )
        elif clean_id == "bill_sentry":
            greeting_text = (
                "Hi there! Glad to connect. I'm auditing our latest service tickets against customer contract pricing to catch any unbilled charges. "
                "How can I help you with your accounts or billing questions today?"
            )
        elif clean_id == "ops_beacon":
            greeting_text = (
                "Hello! Good to see you. I'm tracking our operations metrics, SLA health, and daily performance numbers. "
                "What reports or data summaries can I pull together for you today?"
            )
        elif clean_id == "dispute_shield":
            greeting_text = (
                "Hi, good to connect with you! I'm reviewing customer billing inquiries and pulling certified backup documentation. "
                "Do you have a specific customer dispute or ticket you'd like me to look into?"
            )
        elif clean_id == "resolve_x":
            greeting_text = (
                "Hey there! Ready to help you review, approve, or settle any open discrepancies in the ledger. "
                "What would you like to work on together?"
            )
        else:
            greeting_text = (
                "Hello! Good to talk with you. I'm actively monitoring our operations pipelines. "
                "What can I help you look up or resolve today?"
            )
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "happy",
            "funny_action": "",
            "response": greeting_text,
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Team Assistant",
            "ai_model": "human-interactive",
        }

    # 3. How are you / how's it going
    if any(phrase in msg_lower for phrase in ["how are you", "how're you", "how are you doing", "how is it going", "how's it going", "what's up", "whats up"]):
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "happy",
            "funny_action": "",
            "response": "Doing great, thank you for asking! Everything is running smoothly on our end and I'm ready to help. How are things going on your side?",
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Team Assistant",
            "ai_model": "human-interactive",
        }

    # 4. Thank you / appreciation
    if any(phrase in msg_lower for phrase in ["thank you", "thanks", "appreciate it", "thx", "awesome"]):
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "happy",
            "funny_action": "",
            "response": "You're very welcome! Always happy to help. Let me know if you need anything else on your shift.",
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Team Assistant",
            "ai_model": "human-interactive",
        }

    # 5. Status / Current activity
    if any(k in msg_lower for k in ["what are you doing", "doing right now", "status", "current task", "busy"]):
        action = profile["current_live_action"]
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "thinking",
            "funny_action": "",
            "response": f"Right now I'm {action.lower() if action.startswith(('Comparing', 'Monitoring', 'Auditing')) else action}\n\nAll connections to {', '.join(profile['linked_systems'][:2])} are healthy and updating in real time. What would you like to review?",
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Team Assistant",
            "ai_model": "human-interactive",
        }

    # 6. Explaining role / how they help
    if any(k in msg_lower for k in ["how do you work", "explain", "how do you help", "what do you do", "who are you", "what is your role", "what are your capabilities", "help me with"]):
        if clean_id == "ticket_hawk":
            explanation = (
                "Here's what I do: drivers in the field record their estimated container weights, while certified landfill scale houses print computerized gross/tare scale slips. "
                "Even a small discrepancy—like half a ton—can lead to thousands of dollars in billing errors over time. "
                "I cross-reference every ticket against certified weight logs in real time so our team can catch and fix tonnage discrepancies before customers are invoiced."
            )
        elif clean_id == "dispatch_pulse":
            explanation = (
                "My focus is keeping fleet telematics and dispatch logs in sync. I monitor live GPS pings from the trucks against the day's scheduled routes. "
                "If a truck gets reassigned, takes an unscheduled detour, or misses a geofenced zone, I flag it right away so dispatch and billing stay on the exact same page."
            )
        elif clean_id == "bill_sentry":
            explanation = (
                "In waste and logistics, drivers frequently perform extra roll-off pickups, swaps, or container moves that end up forgotten on paperwork. "
                "I audit every completed service ticket against the customer's contracted rate sheet. If any service is unbilled or uses an expired discount, I catch it so no revenue leaks."
            )
        elif clean_id == "ops_beacon":
            explanation = (
                "I oversee our team's operational analytics and executive visibility. I pull together live data across scale tickets, dispatch routes, billing audits, and customer disputes into cohesive KPI dashboards and executive reports, helping leadership spot systemic issues quickly."
            )
        elif clean_id == "resolve_x":
            explanation = (
                "Once our team spots a verified discrepancy, I handle the resolution workflow. For routine items under $500, I can automatically execute ledger writebacks and adjustments. "
                "For larger discrepancies ($500 or more), I prepare clean, 1-click approval packets for supervisors to review and sign off on."
            )
        else:  # dispute_shield
            explanation = (
                "When a customer questions a charge on their invoice, I assemble the full paper trail—including the driver's signed ticket, certified landfill scale receipts, and GPS timestamp logs. "
                "I draft polite, fact-based resolution responses with certified evidence, helping resolve billing inquiries quickly while protecting the client relationship."
            )

        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "proud",
            "funny_action": "",
            "response": f"{explanation}\n\nFeel free to ask me to look up any specific account, ticket, or open exception!",
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Team Assistant",
            "ai_model": "human-interactive",
        }

    # 7. Team overview
    if any(k in msg_lower for k in ["team", "other agents", "colleagues", "coworkers", "who else"]):
        team_talk = (
            "Here's our operations team:\n\n"
            "• 🔍 **TicketHawk**: Scale & tonnage specialist — audits landfill gross/tare scale slips against driver weight estimates.\n"
            "• 🚚 **DispatchPulse**: Fleet logistics lead — tracks live GPS telematics, driver routes, and dispatch sync.\n"
            "• 💰 **BillSentry**: Billing assurance auditor — audits tickets against contract rate books to stop unbilled hauls.\n"
            "• 🔮 **ReportBeacon**: Operations intelligence lead — synthesizes fleet KPIs, health metrics, and executive dashboards.\n"
            "• 🛡️ **DisputeShield**: Customer dispute specialist — backs up customer conversations with certified tickets and GPS proof.\n"
            "• ⚡ **ResolveX**: Discrepancy settlement lead — executes instant auto-settlements (<$500) and stages supervisor approvals.\n\n"
            "We collaborate continuously so nothing falls through the cracks in your hauling operations."
        )
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "happy",
            "funny_action": "",
            "response": team_talk,
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Team Assistant",
            "ai_model": "human-interactive",
        }

    # 8. General conversational fallback (Warm, helpful human colleague)
    if clean_id == "ticket_hawk":
        body = (
            f"I'm keeping a close eye on our scale tickets and weight logs today. "
            f"If you'd like to check on \"{message}\", I can look up specific scale tickets, "
            f"tonnage discrepancies, or open weight exceptions for you."
        )
    elif clean_id == "dispatch_pulse":
        body = (
            f"I'm tracking our active routes and fleet telematics. "
            f"Regarding \"{message}\", let me know if you want to inspect a specific truck, "
            f"route divergence, or driver log."
        )
    elif clean_id == "bill_sentry":
        body = (
            f"I'm reviewing completed service tickets against our contract price books. "
            f"Regarding \"{message}\", I can pull up unbilled pickups, rate mismatches, "
            f"or specific customer billing records whenever you're ready."
        )
    elif clean_id == "ops_beacon":
        body = (
            f"I'm tracking our cross-fleet operations data and reporting KPIs. "
            f"Regarding \"{message}\", let me know if you'd like a summary of open exceptions, "
            f"revenue impact, or team resolution rates."
        )
    elif clean_id == "resolve_x":
        body = (
            f"I'm monitoring our ledger adjustments and approval queues. "
            f"Regarding \"{message}\", I can show you pending supervisor approvals, "
            f"auto-settlement history, or recent writebacks."
        )
    else:
        body = (
            f"I'm here to help with any customer inquiries, documentation checks, or ticket reviews. "
            f"Regarding \"{message}\", feel free to share the account name or ticket number and I'll look into it."
        )

    return {
        "agent_id": clean_id,
        "agent_name": agent_name,
        "robot_nickname": agent_name,
        "avatar_mood": "thinking",
        "funny_action": "",
        "response": body,
        "linked_systems_active": profile["linked_systems"],
        "ai_provider": "Operations Team Assistant",
        "ai_model": "human-interactive",
    }


_LEADING_ACTION_RE = re.compile(r"^\s*\*(?!\*)([^*\n]{1,160})\*(?!\*)\s*")

_DATA_INTENT_KEYWORDS = (
    "how many", "how much", "total", "count", "list", "show", "which", "find", "search", "top",
    "exception", "discrepanc", "invoice", "ticket", "record", "customer", "approval", "pending",
    "open", "resolved", "unbilled", "duplicate", "rate", "dispatch", "load", "document", "summary",
    "kpi", "revenue", "leak", "amount", "$",
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
    """Best-effort DB answer when no LLM is available (keyword routing over the safe tools)."""
    msg = message.lower()
    try:
        if "approval" in msg or "pending" in msg:
            res = data_tools.list_pending_approvals(limit=10)
            if not res["count"]:
                return "There are no approvals waiting on a decision right now."
            lines = [f"There are **{res['count']}** pending approval(s):"]
            for a in res["approvals"]:
                e = a["exception"]
                lines.append(f"- {e['title']} ({e['type']}) — {_fmt_money(e['discrepancy_amount'])}")
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
                return "I couldn't find any matching exceptions."
            label = f"{status} " if status else ""
            lines = [f"Here are the top {label}exceptions by dollar impact:"]
            for e in res["exceptions"]:
                lines.append(
                    f"- {e['title']} — {_fmt_money(e['discrepancy_amount'])} · {e['severity']} · {e['status']}"
                )
            return "\n".join(lines)

        if any(k in msg for k in ("invoice", "ticket", "record", "dispatch", "load")):
            rtype = next(
                (t for k, t in (("invoice", "invoice"), ("ticket", "service_ticket"),
                                ("dispatch", "dispatch_record"), ("load", "load_record")) if k in msg),
                None,
            )
            res = data_tools.search_records(record_type=rtype, limit=10)
            if not res["count"]:
                return "I couldn't find any matching records."
            lines = [f"Here are the latest {(rtype or 'record').replace('_', ' ')}s:"]
            for r in res["records"]:
                amt = f" — {_fmt_money(r['amount'])}" if r["amount"] is not None else ""
                lines.append(f"- {r['external_reference']} · {r['customer']}{amt} · {r['status']}")
            return "\n".join(lines)

        s = data_tools.get_operations_summary()
        by_status = ", ".join(f"{k}: {v}" for k, v in s["exceptions_by_status"].items()) or "none"
        return (
            "Here's the current operations snapshot:\n"
            f"- **{s['total_records']}** operational records\n"
            f"- **{s['total_exceptions']}** exceptions ({by_status})\n"
            f"- **{_fmt_money(s['unresolved_discrepancy_amount_usd'])}** unresolved discrepancy value\n"
            f"- **{_fmt_money(s['resolved_discrepancy_amount_usd'])}** resolved/recovered\n"
            f"- **{s['pending_approvals']}** pending approvals"
        )
    except Exception as e:
        logger.warning(f"Offline data answer failed: {e}")
        return None


def generate_minion_chat_response(
    agent_id: str,
    message: str,
    context: dict[str, Any] | None = None,
    history: list[dict[str, str]] | None = None,
    data_tools: Any | None = None,
) -> dict[str, Any]:
    """
    Generate a natural, conversational chat response from the selected operations agent.
    - Multi-turn: `history` is a list of {"role": "user"|"assistant", "content": str}.
    - Data-aware: `data_tools` (e.g. backend OperationsDataTools) exposes read-only,
      tenant-scoped DB queries that the LLM can call via tool-calling.
    Uses multi-provider LLM (Gemini -> OpenAI) with deterministic fallback.
    """
    clean_id = agent_id.lower().replace("-", "_")
    if clean_id == "report_beacon":
        clean_id = "ops_beacon"
    profile = AGENT_STUDIO_PROFILES.get(clean_id, AGENT_STUDIO_PROFILES["ticket_hawk"])
    agent_name = profile["agent_name"]
    primary_emoji = profile.get("primary_emoji", "🤖")

    tools: list[Any] = []
    if data_tools is not None:
        try:
            tools = data_tools.as_langchain_tools()
        except Exception as e:
            logger.warning(f"Could not build chat data tools ({e}); continuing without DB access.")

    # 1. Attempt LLM invocation (Gemini -> OpenAI)
    llm_text, provider_name, model_name, tools_used = invoke_agent_llm(
        profile, message, context, history=history, tools=tools
    )

    if llm_text:
        clean_speech = _clean_human_response(llm_text)
        if not clean_speech:
            clean_speech = llm_text.strip()

        funny_action = (
            f"Queried {', '.join(tools_used)}"
            if tools_used
            else ""
        )

        mood = "thinking"
        text_lower = clean_speech.lower()
        if any(k in text_lower for k in ["joke", "laugh", "haha", "humor", "smile"]):
            mood = "laughing"
        elif any(k in text_lower for k in ["scan", "sensor", "telemetry", "tracking", "gps", "calibrat"]):
            mood = "scanning"
        elif any(k in text_lower for k in ["proud", "zero tonnage", "unbilled", "settled", "protect", "certif"]):
            mood = "proud"
        elif any(k in text_lower for k in ["hello", "greet", "pleasure", "glad", "hey", "welcome", "good"]):
            mood = "happy"

        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": mood,
            "funny_action": funny_action,
            "response": clean_speech,
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": provider_name,
            "ai_model": model_name,
            "tools_used": tools_used,
        }

    # 2. Offline DB fallback if the user asked a data question and we have DB access
    if data_tools is not None and _looks_like_data_question(message):
        db_answer = _offline_data_answer(data_tools, message)
        if db_answer:
            return {
                "agent_id": clean_id,
                "agent_name": agent_name,
                "robot_nickname": agent_name,
                "avatar_mood": "scanning",
                "funny_action": "Queried live operations database",
                "response": db_answer,
                "linked_systems_active": profile["linked_systems"],
                "ai_provider": "Live DB Query Engine",
                "ai_model": "sql-direct",
                "tools_used": ["offline_db_query"],
            }

    # 3. Resilient Rule Engine fallback
    return _generate_deterministic_chat_response(clean_id, profile, message)
