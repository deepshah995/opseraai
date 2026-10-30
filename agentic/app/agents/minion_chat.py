"""
Agent Live Chat & Personality Engine
Provides engaging, in-character, yet operations-grounded dialogue
for each of the 5 specialized autonomous operations agents.
"""

import random
from typing import Any

AGENT_STUDIO_PROFILES = {
    "ticket_hawk": {
        "agent_name": "TicketHawk",
        "robot_name": "TicketHawk",  # legacy compatibility
        "name": "TicketHawk",
        "title": "Ticket Discrepancy Agent (TH-01)",
        "color": "emerald",
        "catchphrase": "Zero tonnage slips past my laser scanning focus!",
        "current_live_action": "Calibrating landfill gross/tare scale slip #SC-110 against driver estimate...",
        "linked_systems": [
            "Certified Landfill Scale Houses",
            "Driver Handheld Work Orders",
            "BillSentry Peer Pipeline"
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
        "catchphrase": "10-4 good buddy! GPS lock engaged, zero detour allowed!",
        "current_live_action": "Tracking Truck #402 route divergence along Sector 4 Highway corridor...",
        "linked_systems": [
            "Samsara / Geotab Telematics GPS",
            "AMCS Dispatch Scheduling Engine",
            "Driver Geofence Event Bus"
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
        "catchphrase": "Halt! Unbilled extra pickups shall not pass on my watch!",
        "current_live_action": "Comparing contracted price matrix ($50/ton) vs unbilled roll-off swap charges...",
        "linked_systems": [
            "Enterprise ERP Invoicing",
            "Customer Contract Price Book",
            "DisputeShield Peering Port"
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
        "catchphrase": "Synthesizing fleet health! I generate live executive intelligence on the Report Console!",
        "current_live_action": "Synthesizing cross-tenant data streams and updating live analytics on the Report Console...",
        "linked_systems": [
            "Report Console Analytics Engine",
            "Operations Data Lakehouse",
            "Multi-Facility KPI Aggregator",
            "Executive Briefing Pipeline"
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
        "catchphrase": "Kind words and certified scale proof settle every customer dispute!",
        "current_live_action": "Drafting polite credit adjustment letter for Apex Manufacturing with scale slip SC-110...",
        "linked_systems": [
            "Customer Service Helpdesk / Zendesk",
            "Signed Driver Proof Archive",
            "Billing Ledger Adjustment API"
        ],
        "personality": "Diplomatic, courteous, equipped with protective resolution shield and certified proof draft pen.",
        "emojis": "🛡️✍️🎩⚖️",
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
        "*calibrates scale slip* What do you call a driver who guesses his tonnage? An optimist with an expensive invoice!"
    ],
    "dispatch_pulse": [
        "*spins radar telemetry tracker* Why did the collection truck driver take up gardening? Because he was a natural at curbside pickup!",
        "*radios on dispatch frequency* Why did the GPS navigation system break up with the road map? Because it took too many wrong turns!",
        "*antenna flashes green* What is a dispatcher's favorite key on the keyboard? The SPACE bar... for wide turns!"
    ],
    "bill_sentry": [
        "*taps brass precision monocle* Why was the invoice feeling cold? Because it didn't have any interest applied to it!",
        "*stamps ledger with satisfying click* Why did the accountant cross the road? Because they double-checked the ledger and it was on both sides!",
        "*audits rate matrix* Why do extra roll-off containers love hide and seek? Because without me, they stay unbilled forever!"
    ],
    "ops_beacon": [
        "*stabilizes on telemetry hoverpad* Why are operations matrices the best party hosts? Because they know how to correlate the entire room!",
        "*projects mini holographic chart* How does an AI Agent stay in top shape? By publishing 10,000 live data points to the Report Console every morning!",
        "*twirls purple telemetry dome* Why did the VP of Operations love the Report Console? Because ReportBeacon turned a week of spreadsheet agony into 1.4 seconds of pure clarity!"
    ],
    "dispute_shield": [
        "*buffs polished resolution shield* Why did the customer invite the scale ticket to lunch? Because it made a very compelling point!",
        "*bows courteously* How do you win every invoice disagreement? With polite words, a solid shield, and a signed driver work order!",
        "*adjusts diplomat bowtie* What is a diplomat agent's favorite musical instrument? The Accord... as in mutual customer accord!"
    ],
}
OPERATIONS_JOKES["report_beacon"] = OPERATIONS_JOKES["ops_beacon"]

def generate_minion_chat_response(agent_id: str, message: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Generate an engaging, witty, and operations-grounded chat response
    from the perspective of the specified operations agent.
    """
    clean_id = agent_id.lower().replace("-", "_")
    if clean_id == "report_beacon":
        clean_id = "ops_beacon"
    profile = AGENT_STUDIO_PROFILES.get(clean_id, AGENT_STUDIO_PROFILES["ticket_hawk"])
    agent_name = profile["agent_name"]
    msg_lower = message.lower().strip()

    # Determine response intent
    if any(k in msg_lower for k in ["joke", "funny", "laugh", "make me laugh"]):
        jokes = OPERATIONS_JOKES.get(clean_id, OPERATIONS_JOKES["ticket_hawk"])
        chosen_joke = random.choice(jokes)
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,  # legacy compatibility
            "avatar_mood": "laughing",
            "funny_action": f"{agent_name} flashes its status light and shares a quick operations classic!",
            "response": f"Here is one of my operational favorites:\n\n{chosen_joke}\n\nNow back to protecting our operations!",
            "linked_systems_active": profile["linked_systems"],
        }

    if any(k in msg_lower for k in ["what are you doing", "doing right now", "status", "current task", "busy"]):
        action = profile["current_live_action"]
        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "scanning",
            "funny_action": f"{agent_name} flashes telemetry indicators and points to active data connections!",
            "response": f"Right at this microsecond, I am actively: {action}\n\nI am connected live to {', '.join(profile['linked_systems'][:2])} so our operations team doesn't have to manually cross-reference hundreds of rows!",
            "linked_systems_active": profile["linked_systems"],
        }

    if any(k in msg_lower for k in ["how do you work", "explain", "how do you help", "what do you do", "why"]):
        if clean_id == "ticket_hawk":
            explanation = (
                "*taps digital scale slip* Here is the breakdown! Drivers in the field often write down an estimated container weight. "
                "Meanwhile, the certified landfill scale prints an official computerized gross-tare slip. If there's even a 0.5-ton difference, "
                "money leaks! I intercept both records, do the math in 1.2 seconds, and stage an adjustment for review!"
            )
        elif clean_id == "dispatch_pulse":
            explanation = (
                "*taps radar telemetry* It's all about truck synchronization! I listen to live GPS pings from the trucks and compare them against "
                "the dispatch schedule. If Truck #12 gets reassigned to Truck #18's route, or someone makes an unexpected diversion, "
                "I catch it before billing and route sheets get confused!"
            )
        elif clean_id == "bill_sentry":
            explanation = (
                "*adjusts precision monocle with pride* Hauling companies do dozens of extra pickups that drivers complete but forget to charge for. "
                "Or, an old expired rate code gets applied. I cross-check every single service ticket against the customer's contract price book. "
                "If it's unbilled, I flag it instantly!"
            )
        elif clean_id == "ops_beacon":
            explanation = (
                "*holographic projector activates* I am the operations intelligence coordinator! While TicketHawk, DispatchPulse, BillSentry, DisputeShield, and ResolveX handle the frontline, "
                "I aggregate all their data streams into a 360° health score. I spot which landfill or terminal has the highest leakage rate!"
            )
        elif clean_id == "resolve_x":
            explanation = (
                "*readies automated settlement stamp* Once TicketHawk or BillSentry spots a verified mismatch, someone has to fix it! "
                "Instead of waiting 4.8 business days for manual email chains, I step in. For routine discrepancies under $500, "
                "I automatically execute ledger writebacks and credit memos in 1.2 seconds. For high-dollar items (>= $500), I stage a 1-click approval for supervisors!"
            )
        else: # dispute_shield
            explanation = (
                "*salutes with silver fountain pen* When an unhappy customer calls shouting 'You overcharged my container!', accounts payable freezes. "
                "I pull the driver's signed ticket, match it with TicketHawk's certified scale receipt, write a polite, ironclad explanation, "
                "and resolve the dispute without losing the customer relationship!"
            )

        return {
            "agent_id": clean_id,
            "agent_name": agent_name,
            "robot_nickname": agent_name,
            "avatar_mood": "proud",
            "funny_action": f"{agent_name} displays its operational badges with pride!",
            "response": explanation,
            "linked_systems_active": profile["linked_systems"],
        }

    if any(k in msg_lower for k in ["team", "other agents", "friends", "together", "colleagues"]):
        team_talk = (
            "*signals with pride to fellow operations agents* We are an unstoppable autonomous operations squad!\n\n"
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
            "funny_action": f"{agent_name} synchronizes telemetry pings across all 6 agents!",
            "response": team_talk,
            "linked_systems_active": profile["linked_systems"],
        }

    # Contextual or default response tailored to this agent
    context_prefix = f"*telemetry indicator blinks with {profile['color']} status light*\n\n"
    if clean_id == "ticket_hawk":
        body = f"I hear you loud and clear! I'm watching all scale tickets like a hawk. You asked: \"{message}\". Rest assured, all certified scale slips and driver weight logs in your system are verified down to the tenth of a ton!"
    elif clean_id == "dispatch_pulse":
        body = f"Roger that! 10-4! You asked: \"{message}\". All fleet telematics and truck route breadcrumbs are streaming with zero signal loss right now!"
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
        "funny_action": f"{agent_name} jots down an operational record and confirms readiness!",
        "response": context_prefix + body,
        "linked_systems_active": profile["linked_systems"],
    }
