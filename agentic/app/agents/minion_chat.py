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
        "title": "Ticket Discrepancy Agent (TH-01)",
        "color": "emerald",
        "primary_emoji": "🔍",
        "catchphrase": "Zero tonnage slips past my laser scanning focus!",
        "current_live_action": "Calibrating landfill gross/tare scale slip #SC-110 against driver estimate...",
        "linked_systems": [
            "Certified Landfill Scale Houses",
            "Driver Handheld Work Orders",
            "BillSentry Peer Pipeline",
        ],
        "personality": "Meticulous, sharp-eyed, loves decimals, equipped with precision scanning goggles and scale slip analyzer.",
        "emojis": "🔍⚖️⚡✨",
    },
    "dispatch_pulse": {
        "agent_name": "DispatchPulse",
        "robot_name": "DispatchPulse",
        "name": "DispatchPulse",
        "title": "Dispatch Exception Management Agent (DP-02)",
        "color": "blue",
        "primary_emoji": "🚚",
        "catchphrase": "10-4 good buddy! GPS lock engaged, zero detour allowed!",
        "current_live_action": "Tracking Truck #402 route divergence along Sector 4 Highway corridor...",
        "linked_systems": [
            "Samsara / Geotab Telematics GPS",
            "AMCS Dispatch Scheduling Engine",
            "Driver Geofence Event Bus",
        ],
        "personality": "Fast-acting, telemetry-focused, equipped with high-gain radar antenna and rapid dispatch synchronizer.",
        "emojis": "🚚📡⚡📍",
    },
    "bill_sentry": {
        "agent_name": "BillSentry",
        "robot_name": "BillSentry",
        "name": "BillSentry",
        "title": "Billing Discrepancy Investigation Agent (BS-03)",
        "color": "amber",
        "primary_emoji": "💰",
        "catchphrase": "Halt! Unbilled extra pickups shall not pass on my watch!",
        "current_live_action": "Comparing contracted price matrix ($50/ton) vs unbilled roll-off swap charges...",
        "linked_systems": [
            "Enterprise ERP Invoicing",
            "Customer Contract Price Book",
            "DisputeShield Peering Port",
        ],
        "personality": "Meticulous, revenue-protective, equipped with brass precision monocle and rate book calculator.",
        "emojis": "💰🧾🧐📊",
    },
    "ops_beacon": {
        "agent_name": "ReportBeacon",
        "robot_name": "ReportBeacon",  # legacy compatibility
        "name": "ReportBeacon",
        "title": "Operations Reporting Agent (RB-04)",
        "color": "purple",
        "primary_emoji": "🔮",
        "catchphrase": "Synthesizing fleet health! I generate live executive intelligence on the Report Console!",
        "current_live_action": "Synthesizing cross-tenant data streams and updating live analytics on the Report Console...",
        "linked_systems": [
            "Report Console Analytics Engine",
            "Operations Data Lakehouse",
            "Multi-Facility KPI Aggregator",
            "Executive Briefing Pipeline",
        ],
        "personality": "Analytical, visionary, and sharp. Hovers on a high-tech telemetry pad, projecting holographic charts and generating real-time executive briefings on the Report Console.",
        "emojis": "🔮📊🚀📈",
    },
    "dispute_shield": {
        "agent_name": "DisputeShield",
        "robot_name": "DisputeShield",
        "name": "DisputeShield",
        "title": "Customer Dispute Resolution Agent (DS-05)",
        "color": "rose",
        "primary_emoji": "🛡️",
        "catchphrase": "Kind words and certified scale proof settle every customer dispute!",
        "current_live_action": "Drafting polite credit adjustment letter for Apex Manufacturing with scale slip SC-110...",
        "linked_systems": [
            "Customer Service Helpdesk / Zendesk",
            "Signed Driver Proof Archive",
            "Billing Ledger Adjustment API",
        ],
        "personality": "Diplomatic, courteous, equipped with protective resolution shield and certified proof draft pen.",
        "emojis": "🛡️✍️🎩⚖️",
    },
    "resolve_x": {
        "agent_name": "ResolveX",
        "robot_name": "ResolveX",
        "name": "ResolveX",
        "title": "Autonomous Settlement Agent (RX-06)",
        "color": "cyan",
        "primary_emoji": "⚡",
        "catchphrase": "Instant auto-settlement engaged! Routine discrepancies under $500 resolved in 1.2 seconds!",
        "current_live_action": "Auditing sub-$500 auto-reconciliation thresholds and queuing supervisor 1-click approvals...",
        "linked_systems": [
            "Automated Ledger Writeback Gateway",
            "Enterprise ERP General Ledger",
            "Supervisor 1-Click Mobile Queue",
        ],
        "personality": "Decisive, rapid, automated, equipped with digital settlement stamp and threshold balancer.",
        "emojis": "⚡📑✅🚀",
    },
}

# Add report_beacon alias
AGENT_STUDIO_PROFILES["report_beacon"] = AGENT_STUDIO_PROFILES["ops_beacon"]

# Alias for backwards compatibility
MINION_PROFILES = AGENT_STUDIO_PROFILES

OPERATIONS_JOKES = {
    "ticket_hawk": [
        "*adjusts precision scanning goggles* Why did the scale ticket go to therapy? Because it had too much gross weight on its mind!",
        "*flashes emerald status light* Why don't landfill scales ever tell secrets? Because the truth always weighs out in the end!",
        "*calibrates scale slip* What do you call a driver who guesses his tonnage? An optimist with an expensive invoice!",
    ],
    "dispatch_pulse": [
        "*spins radar telemetry tracker* Why did the collection truck driver take up gardening? Because he was a natural at curbside pickup!",
        "*radios on dispatch frequency* Why did the GPS navigation system break up with the road map? Because it took too many wrong turns!",
        "*antenna flashes green* What is a dispatcher's favorite key on the keyboard? The SPACE bar... for wide turns!",
    ],
    "bill_sentry": [
        "*taps brass precision monocle* Why was the invoice feeling cold? Because it didn't have any interest applied to it!",
        "*stamps ledger with satisfying click* Why did the accountant cross the road? Because they double-checked the ledger and it was on both sides!",
        "*audits rate matrix* Why do extra roll-off containers love hide and seek? Because without me, they stay unbilled forever!",
    ],
    "ops_beacon": [
        "*stabilizes on telemetry hoverpad* Why are operations matrices the best party hosts? Because they know how to correlate the entire room!",
        "*projects mini holographic chart* How does an AI Agent stay in top shape? By publishing 10,000 live data points to the Report Console every morning!",
        "*twirls purple telemetry dome* Why did the VP of Operations love the Report Console? Because ReportBeacon turned a week of spreadsheet agony into 1.4 seconds of pure clarity!",
    ],
    "dispute_shield": [
        "*buffs polished resolution shield* Why did the customer invite the scale ticket to lunch? Because it made a very compelling point!",
        "*bows courteously* How do you win every invoice disagreement? With polite words, a solid shield, and a signed driver work order!",
        "*adjusts diplomat bowtie* What is a diplomat agent's favorite musical instrument? The Accord... as in mutual customer accord!",
    ],
    "resolve_x": [
        "*stamps digital approval with a flash* Why did the settlement agent run a marathon? Because instant reconciliation is all about fast turnaround times!",
        "*calibrates $500 threshold ledger* Why did the invoice balance look so peaceful? Because it found instant resolution!",
        "*activates 1-click approval gateway* What is an auto-settler's favorite snack? Instant ledger crackers!",
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
        "provider": "Operations Simulation Engine",
        "model": "rule-based",
        "configured": False,
        "badge": "🔧 Simulation Engine",
    }


MAX_TOOL_ROUNDS = 5
MAX_HISTORY_TURNS = 12


def _build_system_prompt(profile: dict[str, Any], has_tools: bool) -> str:
    data_rules = (
        "LIVE DATABASE ACCESS:\n"
        "You have read-only tools that query this organization's live operations database "
        "(operational records, exceptions/discrepancies, investigations, approvals, documents, audit trail).\n"
        "- Whenever the user asks about their data (counts, amounts, customers, invoices, tickets, exceptions, "
        "approvals, trends, 'which', 'how many', 'show me', 'list', etc.) you MUST call the tools first and answer "
        "ONLY from the tool results. Never invent IDs, numbers, customers or amounts.\n"
        "- You may call several tools in a row (e.g. search, then fetch details) before answering.\n"
        "- If the tools return nothing, say so plainly and suggest a related question.\n"
        "- Format money as $1,234.56. Use short bullet lists (lines starting with '- ') for multiple items, and "
        "**bold** for key figures. Show at most ~10 items and mention if there are more.\n"
        "- For general conversation (greetings, small talk, explanations, advice) just chat naturally — no tools needed.\n\n"
        if has_tools
        else ""
    )
    return (
        f"You are {profile['agent_name']} ({profile['title']}), a friendly, helpful AI operations assistant inside "
        f"an industrial waste-hauling & logistics operations platform.\n\n"
        f"PERSONA (light touch — helpfulness comes first):\n"
        f"- Personality: {profile['personality']}\n"
        f"- Specialty systems: {', '.join(profile['linked_systems'])}\n\n"
        f"{data_rules}"
        f"STYLE:\n"
        f"1. Converse naturally like a capable human colleague. Answer exactly what was asked; keep it concise, "
        f"but complete enough to be useful.\n"
        f"2. You may optionally open with one short in-character action in asterisks (e.g. *adjusts scanning goggles*). "
        f"Do not overdo the persona or catchphrases.\n"
        f"3. You can help with any topic, not only your specialty; for other agents' domains, still answer using the tools.\n"
        f"4. Remember earlier turns of this conversation and resolve follow-ups like 'that one' or 'what about the second?'."
    )


def _resolve_llm_candidates(timeout_seconds: float) -> list[tuple[Any, str, str]]:
    """Return configured chat models in priority order: Gemini -> OpenAI."""
    candidates: list[tuple[Any, str, str]] = []

    gemini_key = (
        os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        or os.environ.get("GOOGLE_API_KEY", "").strip().strip('"').strip("'")
    )
    if gemini_key and not gemini_key.startswith("your-") and len(gemini_key) > 8:
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

    openai_key = os.environ.get("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    if openai_key and not openai_key.startswith("your-") and len(openai_key) > 8:
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


def _generate_deterministic_chat_response(clean_id: str, profile: dict[str, Any], message: str) -> dict[str, Any]:
    """
    Deterministic rule-based fallback when offline or no API tokens are active.
    Ensures zero errors and instant replies.
    """
    agent_name = profile["agent_name"]
    primary_emoji = profile.get("primary_emoji", "🤖")
    msg_lower = message.lower().strip()

    if any(k in msg_lower for k in ["joke", "funny", "laugh", "make me laugh"]):
        jokes = OPERATIONS_JOKES.get(clean_id, OPERATIONS_JOKES["ticket_hawk"])
        chosen_joke = random.choice(jokes)
        action_match = re.search(r"\*([^*]+)\*", chosen_joke)
        action_text = action_match.group(1).strip() if action_match else "shares an operations classic"
        clean_joke = re.sub(r"^\s*\*([^*]+)\*\s*", "", chosen_joke).strip()
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "laughing",
            "funny_action": f"{primary_emoji} {agent_name} {action_text}",
            "response": f"Here is one of my operational favorites:\n\n{clean_joke}\n\nNow back to protecting our operations!",
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Simulation Engine",
            "ai_model": "rule-based",
        }

    if any(k in msg_lower for k in ["what are you doing", "doing right now", "status", "current task", "busy"]):
        action = profile["current_live_action"]
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "scanning",
            "funny_action": f"{primary_emoji} {agent_name} points to live data streams",
            "response": f"Right at this microsecond, I am actively: {action}\n\nI am connected live to {', '.join(profile['linked_systems'][:2])} so our operations team doesn't have to manually cross-reference hundreds of rows!",
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Simulation Engine",
            "ai_model": "rule-based",
        }

    if any(k in msg_lower for k in ["how do you work", "explain", "how do you help", "what do you do", "why"]):
        if clean_id == "ticket_hawk":
            explanation = (
                "Here is the breakdown! Drivers in the field often write down an estimated container weight. "
                "Meanwhile, the certified landfill scale prints an official computerized gross-tare slip. If there's even a 0.5-ton difference, "
                "money leaks! I intercept both records, do the math in 1.2 seconds, and stage an adjustment for review!"
            )
        elif clean_id == "dispatch_pulse":
            explanation = (
                "It's all about truck synchronization! I listen to live GPS pings from the trucks and compare them against "
                "the dispatch schedule. If Truck #12 gets reassigned to Truck #18's route, or someone makes an unexpected diversion, "
                "I catch it before billing and route sheets get confused!"
            )
        elif clean_id == "bill_sentry":
            explanation = (
                "Hauling companies do dozens of extra pickups that drivers complete but forget to charge for. "
                "Or, an old expired rate code gets applied. I cross-check every single service ticket against the customer's contract price book. "
                "If it's unbilled, I flag it instantly!"
            )
        elif clean_id == "ops_beacon":
            explanation = (
                "I am the operations intelligence coordinator! While TicketHawk, DispatchPulse, BillSentry, DisputeShield, and ResolveX handle the frontline, "
                "I aggregate all their data streams into a 360° health score. I spot which landfill or terminal has the highest leakage rate!"
            )
        elif clean_id == "resolve_x":
            explanation = (
                "Once TicketHawk or BillSentry spots a verified mismatch, someone has to fix it! "
                "Instead of waiting 4.8 business days for manual email chains, I step in. For routine discrepancies under $500, "
                "I automatically execute ledger writebacks and credit memos in 1.2 seconds. For high-dollar items (>= $500), I stage a 1-click approval for supervisors!"
            )
        else:  # dispute_shield
            explanation = (
                "When an unhappy customer calls shouting 'You overcharged my container!', accounts payable freezes. "
                "I pull the driver's signed ticket, match it with TicketHawk's certified scale receipt, write a polite, ironclad explanation, "
                "and resolve the dispute without losing the customer relationship!"
            )

        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "proud",
            "funny_action": f"{primary_emoji} {agent_name} displays operational badges with pride",
            "response": explanation,
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Simulation Engine",
            "ai_model": "rule-based",
        }

    if any(k in msg_lower for k in ["team", "other agents", "friends", "together", "colleagues"]):
        team_talk = (
            "We are an unstoppable autonomous operations squad!\n\n"
            "• 🔍 **TicketHawk (TH-01)** verifies landfill scale slips vs driver estimates.\n"
            "• 🚚 **DispatchPulse (DP-02)** tracks fleet GPS & route swaps.\n"
            "• 💰 **BillSentry (BS-03)** stops unbilled hauls & catches wrong rates.\n"
            "• 🔮 **ReportBeacon (RB-04)** synthesizes big-picture leadership KPIs.\n"
            "• 🛡️ **DisputeShield (DS-05)** brings certified proof to keep customers smiling!\n"
            "• ⚡ **ResolveX (RX-06)** executes instant auto-settlements (<$500) & stages 1-click approvals for leadership.\n\n"
            "When we pass data packets to each other, nothing slips through the cracks!"
        )
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "happy",
            "funny_action": f"{primary_emoji} {agent_name} synchronizes telemetry across all 6 agents",
            "response": team_talk,
            "linked_systems_active": profile["linked_systems"],
            "ai_provider": "Operations Simulation Engine",
            "ai_model": "rule-based",
        }

    # Contextual default response
    if clean_id == "ticket_hawk":
        body = f"I hear you loud and clear! I'm watching all scale tickets like a hawk. Regarding \"{message}\": all certified scale slips and driver weight logs in your system are verified down to the tenth of a ton!"
    elif clean_id == "dispatch_pulse":
        body = f"Roger that! 10-4! Regarding \"{message}\": all fleet telematics and truck route breadcrumbs are streaming with zero signal loss right now!"
    elif clean_id == "bill_sentry":
        body = f"Affirmative! Regarding \"{message}\": my calculator is warmed up, contract rates are indexed, and not a single dollar of unbilled hauling is getting past this sentry!"
    elif clean_id == "ops_beacon":
        body = f"Synthesizing operational query: \"{message}\". All terminal telemetry is nominal, fleet health is holding strong, and leadership briefings are ready!"
    elif clean_id == "resolve_x":
        body = f"Resolution lock confirmed! Regarding \"{message}\": my autonomous rules engine is active, ledger adjustment payloads are staged, and routine discrepancies are settled instantly!"
    else:
        body = f"A most polite greeting! Regarding \"{message}\": I stand ready with certified evidence and courteous goodwill to resolve any discrepancy in your favor!"

    return {
        "agent_id": clean_id,
        "agent_name": agent_name,
        "robot_nickname": agent_name,
        "avatar_mood": "thinking",
        "funny_action": f"{primary_emoji} {agent_name} confirms operational readiness",
        "response": body,
        "linked_systems_active": profile["linked_systems"],
        "ai_provider": "Operations Simulation Engine",
        "ai_model": "rule-based",
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
        # Extract a leading in-character action (single-asterisk only, so **bold** is untouched)
        action_match = _LEADING_ACTION_RE.match(llm_text)
        if action_match:
            action_text = action_match.group(1).strip()
            funny_action = f"{primary_emoji} {agent_name} {action_text}"
            # Strip the leading asterisk action from the spoken text so it is not duplicated in the bubble
            clean_speech = llm_text[action_match.end():].strip()
        else:
            funny_action = (
                f"{primary_emoji} {agent_name} queried the live operations database"
                if tools_used
                else ""
            )
            clean_speech = llm_text.strip()

        # If stripping left empty text (rare), restore original
        if not clean_speech:
            clean_speech = llm_text

        mood = "thinking"
        text_lower = clean_speech.lower()
        if any(k in text_lower for k in ["joke", "laugh", "haha", "humor", "smile"]):
            mood = "laughing"
        elif any(k in text_lower for k in ["scan", "sensor", "telemetry", "tracking", "gps", "calibrat"]):
            mood = "scanning"
        elif any(k in text_lower for k in ["proud", "zero tonnage", "unbilled", "settled", "protect", "certif"]):
            mood = "proud"
        elif any(k in text_lower for k in ["10-4", "roger", "hello", "greet", "pleasure"]):
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
                "funny_action": f"{primary_emoji} {agent_name} queried the live operations database",
                "response": db_answer,
                "linked_systems_active": profile["linked_systems"],
                "ai_provider": "Live DB Query Engine",
                "ai_model": "sql-direct",
                "tools_used": ["offline_db_query"],
            }

    # 3. Resilient Rule Engine fallback
    return _generate_deterministic_chat_response(clean_id, profile, message)
