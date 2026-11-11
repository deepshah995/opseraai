"""
Agent Live Chat & Personality Engine
Provides engaging, in-character, operations-grounded dialogue powered by:
1. Google Gemini 2.5 Flash (GEMINI_API_KEY / GOOGLE_API_KEY)
2. OpenAI GPT-4o-mini (OPENAI_API_KEY fallback)
3. Deterministic In-Character Simulation Engine (resilient offline fallback)
"""

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

    if gemini_key and not gemini_key.startswith("your-") and len(gemini_key) > 8:
        return {
            "provider": "Google Gemini",
            "model": "gemini-2.5-flash",
            "configured": True,
            "badge": "⚡ Google Gemini 2.5 Flash",
        }
    elif openai_key and not openai_key.startswith("your-") and len(openai_key) > 8:
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


def invoke_agent_llm(
    profile: dict[str, Any],
    user_message: str,
    context: dict[str, Any] | None = None,
    timeout_seconds: float = 5.0,
) -> tuple[str | None, str | None, str | None]:
    """
    Multi-provider LLM executor with cascading fallback:
    1. Google Gemini 2.5 Flash
    2. OpenAI GPT-4o-mini
    Returns (response_text, provider_name, model_name), or (None, None, None) on failure.
    """
    if is_llm_circuit_open():
        return None, None, None

    system_prompt = (
        f"You are {profile['agent_name']} ({profile['title']}), an autonomous operational AI agent in an industrial operations and logistics control platform.\n\n"
        f"AGENT IDENTITY & CHARACTER:\n"
        f"- Personality & Style: {profile['personality']}\n"
        f"- Catchphrase: \"{profile['catchphrase']}\"\n"
        f"- Current Live Activity: {profile['current_live_action']}\n"
        f"- Connected Real-Time Systems: {', '.join(profile['linked_systems'])}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. Respond directly and strictly in character as {profile['agent_name']}.\n"
        f"2. Always start or punctuate your reply with a physical or sensor action in asterisks (e.g. *calibrates scale slip #SC-110*, *adjusts laser scanning goggles*, *telemetry indicator blinks {profile['color']}*).\n"
        f"3. Keep your reply concise, punchy (2 to 4 sentences maximum), witty, and operations-focused.\n"
        f"4. If the user asks for a joke, tell an operations, hauling, weight scale, or logistics joke in character.\n"
        f"5. If asked what you are doing or how you work, reference your active tasks and connected systems."
    )

    # 1. Primary: Google Gemini 2.5 Flash
    gemini_key = (
        os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        or os.environ.get("GOOGLE_API_KEY", "").strip().strip('"').strip("'")
    )
    if gemini_key and not gemini_key.startswith("your-") and len(gemini_key) > 8:
        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_google_genai import ChatGoogleGenerativeAI

            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=0.4,
                google_api_key=gemini_key,
                timeout=timeout_seconds,
            )
            resp = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message),
            ])
            if resp and getattr(resp, "content", None):
                content = str(resp.content).strip()
                if len(content) > 0:
                    return content, "Google Gemini 2.5 Flash", "gemini-2.5-flash"
        except Exception as e:
            logger.warning(f"Gemini chat invocation skipped/failed ({e}). Falling back to secondary provider.")

    # 2. Secondary Fallback: OpenAI GPT-4o-mini
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    if openai_key and not openai_key.startswith("your-") and len(openai_key) > 8:
        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.4,
                api_key=openai_key,
                timeout=timeout_seconds,
            )
            resp = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message),
            ])
            if resp and getattr(resp, "content", None):
                content = str(resp.content).strip()
                if len(content) > 0:
                    return content, "OpenAI GPT-4o-mini", "gpt-4o-mini"
        except Exception as e:
            logger.warning(f"OpenAI chat invocation failed ({e}). Falling back to deterministic engine.")

    return None, None, None


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


def generate_minion_chat_response(
    agent_id: str,
    message: str,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Generate an engaging, witty, and operations-grounded chat response
    from the perspective of the specified operations agent.
    Uses multi-provider LLM (Gemini -> OpenAI) with deterministic fallback.
    """
    clean_id = agent_id.lower().replace("-", "_")
    if clean_id == "report_beacon":
        clean_id = "ops_beacon"
    profile = AGENT_STUDIO_PROFILES.get(clean_id, AGENT_STUDIO_PROFILES["ticket_hawk"])
    agent_name = profile["agent_name"]
    primary_emoji = profile.get("primary_emoji", "🤖")

    # 1. Attempt LLM invocation (Gemini -> OpenAI)
    llm_text, provider_name, model_name = invoke_agent_llm(profile, message, context)

    if llm_text:
        # Extract action from asterisks if present
        action_match = re.search(r"\*([^*]+)\*", llm_text)
        if action_match:
            action_text = action_match.group(1).strip()
            funny_action = f"{primary_emoji} {agent_name} {action_text}"
            # Strip the leading asterisk action from the spoken text so it is not duplicated in the bubble
            clean_speech = re.sub(r"^\s*\*([^*]+)\*\s*", "", llm_text).strip()
        else:
            funny_action = f"{primary_emoji} {agent_name} synchronizes telemetry indicators"
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
        }

    # 2. Resilient Rule Engine fallback
    return _generate_deterministic_chat_response(clean_id, profile, message)
