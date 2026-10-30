"""Central Registry for the 5 Specialized Operations AI Agents.

Defines agent identities, cool names, personas, capabilities, and interactive tutorials.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentTutorialStep:
    step_number: int
    title: str
    concept: str
    why_it_matters: str
    industry_example: str
    action_preview: str

@dataclass
class AgentDefinition:
    id: str
    name: str
    code_name: str
    title: str
    tagline: str
    category: str
    color_theme: str  # e.g., 'blue', 'amber', 'emerald', 'purple', 'rose'
    icon_name: str
    avatar_url: str
    specialization: str
    reconciles_records: list[str]
    exception_types_handled: list[str]
    key_metrics: dict[str, Any]
    capabilities: list[str]
    simple_summary: str
    full_tutorial: list[dict[str, Any]]
    sample_scenarios: list[dict[str, Any]]
    minion_profile: dict[str, Any] = field(default_factory=dict)

AGENTS_REGISTRY: dict[str, AgentDefinition] = {
    "ticket_hawk": AgentDefinition(
        id="ticket_hawk",
        name="TicketHawk",
        code_name="TH-01",
        title="Automated Ticket Discrepancy Resolution Agent",
        tagline="The Field & Scale Guardian: Catching weight variance, tonnage leaks, and unverified service tickets.",
        category="Ticket & Scale Operations",
        color_theme="emerald",
        icon_name="Scale",
        avatar_url="/agents/ticket_hawk.svg",
        specialization="Certified scale receipts vs field driver tickets & unit tonnage reconciliation",
        reconciles_records=["service_ticket", "load_record"],
        exception_types_handled=["quantity_mismatch"],
        key_metrics={
            "accuracy_rate": "99.4%",
            "avg_resolution_time": "1.2s",
            "recovered_leakage_mtd": "$14,250",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "Certified Landfill/Disposal Scale vs Driver Log Matching",
            "Automatic Net Weight Variance Calculation & Tolerance Checking",
            "Rate-per-ton Financial Impact Computation",
            "One-Click Tonnage Adjustment & Credit Memo Payload Generation",
        ],
        simple_summary="When a garbage or recycling truck goes to the dump, the facility's scale prints an official weight receipt. Drivers also write down an estimated weight on their ticket. If the bill uses the driver's estimate instead of the real scale slip, the company loses money or overcharges. TicketHawk compares the two, does the exact math, and fixes the difference.",
        full_tutorial=[
            {
                "step": 1,
                "title": "The Everyday Problem in Hauling",
                "explanation": "Drivers often estimate a container's weight in the field (e.g. 'Looks like 6.5 tons'). But landfills charge by certified truck scales. If the dump scale says 4.2 tons, you are overbilling the client. If the dump scale says 8.1 tons, you are paying the dump out of your own pocket without charging the client.",
                "papers_compared": ["Signed Field Service Ticket", "Certified Disposal Facility Scale Receipt"],
            },
            {
                "step": 2,
                "title": "What TicketHawk Does Automatically",
                "explanation": "TicketHawk cross-checks the scale ticket number referenced on the driver slip. It pulls the net weight, compares it against the recorded tonnage, and flags any divergence greater than 0.01 tons.",
                "papers_compared": ["Scale Weight (Net Tons)", "Driver Recorded Tons"],
            },
            {
                "step": 3,
                "title": "The Outcome & Business Benefit",
                "explanation": "TicketHawk computes the exact dollar impact using the customer's contract rate per ton. It generates a recommended Credit Memo or Re-Bill proposal with certified scale citations ready for manager approval.",
                "papers_compared": ["Manager One-Click Approval", "Financial Ledger Sync"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "th_scale_overestimate",
                "title": "Over-Estimated Commercial Compactor Tonnage",
                "customer": "Apex Manufacturing Corp",
                "ticket_no": "TKT-4410",
                "scale_slip": "SC-110",
                "ticket_tonnage": 6.8,
                "certified_tonnage": 4.0,
                "contract_rate": 50.0,
                "variance": -2.8,
                "expected_resolution": "Issue Credit Memo for $140.00 Overcharge on TKT-4410",
            },
            {
                "scenario_id": "th_underbilled_heavy_haul",
                "title": "Heavy Construction Debris Underbilled",
                "customer": "Metro Infrastructure LLC",
                "ticket_no": "TKT-8821",
                "scale_slip": "SC-209",
                "ticket_tonnage": 8.0,
                "certified_tonnage": 11.5,
                "contract_rate": 65.0,
                "variance": 3.5,
                "expected_resolution": "Issue Supplementary Invoice for $227.50 Undercharge on TKT-8821",
            },
        ],
    ),
    "dispatch_pulse": AgentDefinition(
        id="dispatch_pulse",
        name="DispatchPulse",
        code_name="DP-02",
        title="Dispatch Exception Management Agent",
        tagline="The Fleet Sentinel: Synchronizing schedules, truck reassignments, and route divergences.",
        category="Fleet & Route Operations",
        color_theme="blue",
        icon_name="Truck",
        avatar_url="/agents/dispatch_pulse.svg",
        specialization="Fleet dispatch schedules vs driver field completion logs & vehicle reassignments",
        reconciles_records=["dispatch_record", "service_ticket"],
        exception_types_handled=["dispatch_discrepancy"],
        key_metrics={
            "accuracy_rate": "98.9%",
            "avg_resolution_time": "0.9s",
            "schedule_divergence_caught": "38 routes/mo",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "Vehicle/Truck ID Reassignment Detection (e.g. Truck #12 scheduled vs Truck #5 actual)",
            "Date Divergence & Service Window Drift Identification",
            "Route Skip & Driver Field Exception Corroboration",
            "Automatic Dispatch Schedule Alignment without financial penalty",
        ],
        simple_summary="The dispatcher in the office schedules a specific truck (like Truck #12) to pick up a bin on Monday. But in the field, Truck #12 had mechanical trouble, so the driver took Truck #5 on Tuesday instead. DispatchPulse detects this mismatch instantly, explains the shift, and updates operational manifests so maintenance and billing stay accurate.",
        full_tutorial=[
            {
                "step": 1,
                "title": "The Fleet Disconnect",
                "explanation": "Dispatch plans change constantly due to vehicle breakdowns, weather delays, and emergency reroutes. If the field driver operates a different truck or completes the haul on a different day, the dispatch manifest disagrees with the driver's ticket.",
                "papers_compared": ["Dispatch Daily Schedule Manifest", "Driver Field Service Log"],
            },
            {
                "step": 2,
                "title": "What DispatchPulse Does Automatically",
                "explanation": "DispatchPulse compares the scheduled vehicle ID and planned service date against the driver's signed timestamp. If they diverge, it logs the operational exception and verifies whether customer SLA was preserved.",
                "papers_compared": ["Scheduled Truck ID vs Actual Truck ID", "Target Date vs Execution Date"],
            },
            {
                "step": 3,
                "title": "The Outcome & Business Benefit",
                "explanation": "DispatchPulse aligns the dispatch record with the signed field ticket. It confirms no billing adjustments are needed while ensuring accurate truck maintenance hours and fleet compliance.",
                "papers_compared": ["Dispatch Manifest Updated", "Zero Customer Billing Impact"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "dp_truck_swap",
                "title": "Emergency Vehicle Reassignment (Truck #12 to #05)",
                "customer": "Summit Construction Ltd",
                "dispatch_ref": "DISP-2024-001",
                "ticket_no": "TKT-4411",
                "scheduled_truck": "TRUCK-12",
                "actual_truck": "TRUCK-05",
                "expected_resolution": "Align Dispatch Manifest Schedule with Signed Field Ticket (Truck #05 verified)",
            },
        ],
    ),
    "bill_sentry": AgentDefinition(
        id="bill_sentry",
        name="BillSentry",
        code_name="BS-03",
        title="Billing Discrepancy Investigation Agent",
        tagline="The Revenue Protector: Stopping unbilled hauls, rate mismatches, and duplicate customer charges.",
        category="Revenue & Financial Operations",
        color_theme="amber",
        icon_name="Receipt",
        avatar_url="/agents/bill_sentry.svg",
        specialization="Customer invoices vs signed tickets, contract rates, and cross-invoice duplicate checks",
        reconciles_records=["invoice", "service_ticket"],
        exception_types_handled=["rate_mismatch", "unbilled_job", "duplicate_billing"],
        key_metrics={
            "accuracy_rate": "99.8%",
            "avg_resolution_time": "1.5s",
            "revenue_leakage_prevented": "$38,900/mo",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "Contract Rate vs Billed Rate Verification (detects rogue rate increases or discounts)",
            "Unbilled Completed Hauls Detection (stops the 3-5% industry revenue leak)",
            "Cross-Invoice Duplicate Charge Detection (prevents double-billing the same ticket)",
            "One-Click Automated Credit Memo & Rebill Payload Generation",
        ],
        simple_summary="In a busy office, invoices are generated in batches. Sometimes accounting charges $150 when the driver's ticket said $100. Worse yet, drivers complete hauls that get completely lost and never billed at all! BillSentry acts as a 24/7 financial watchdog: it cross-references every bill against tickets and catches overcharges, undercharges, and forgotten bills before clients complain.",
        full_tutorial=[
            {
                "step": 1,
                "title": "Where Companies Lose Millions",
                "explanation": "Accounting departments mail thousands of invoices. A clerical error might enter $250/ton instead of contract $200/ton. Or a ticket gets tucked away and never billed. Across 10,000 hauls a month, these mistakes add up to hundreds of thousands in lost profit.",
                "papers_compared": ["Final Customer Monthly Invoice", "Contract Master Rate & Driver Ticket"],
            },
            {
                "step": 2,
                "title": "What BillSentry Does Automatically",
                "explanation": "BillSentry audits line items mathematically: (Quantity × Contract Rate) vs Billed Line Amount. It also searches for completed tickets that appear on zero invoices, and detects any ticket number billed across two different invoices.",
                "papers_compared": ["Ticket Rates & Amounts", "Invoice Line Items", "Billing Batches"],
            },
            {
                "step": 3,
                "title": "The Outcome & Business Benefit",
                "explanation": "BillSentry packages the finding into an instant manager proposal: 'Generate Invoice for $450 Unbilled Haul' or 'Credit Memo for $75 Rate Variance'. The business recovers cash and eliminates customer billing arguments.",
                "papers_compared": ["Instant Recovery Payload", "Manager Sign-Off Gate"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "bs_rate_mismatch",
                "title": "Billed Rate Higher than Driver Ticket Rate",
                "customer": "Summit Construction Ltd",
                "invoice_ref": "INV-9021",
                "ticket_no": "TKT-4411",
                "billed_amount": 350.0,
                "expected_amount": 275.0,
                "variance": 75.0,
                "expected_resolution": "Issue Credit Memo for $75.00 Overcharge on INV-9021",
            },
            {
                "scenario_id": "bs_unbilled_haul",
                "title": "Completed Rolloff Haul Omitted from Billing Cycle",
                "customer": "Pacific Logistics Hub",
                "ticket_no": "TKT-4413",
                "unbilled_amount": 550.0,
                "status": "completed",
                "expected_resolution": "Generate Invoice for Completed Service Ticket TKT-4413 ($550.00)",
            },
            {
                "scenario_id": "bs_duplicate_bill",
                "title": "Same Compactor Haul Invoiced in Batch 1 and Batch 2",
                "customer": "Summit Construction Ltd",
                "invoices": ["INV-9021", "INV-9099"],
                "duplicate_amount": 350.0,
                "expected_resolution": "Void Duplicate Invoice Charge (INV-9099) for $350.00",
            },
        ],
    ),
    "ops_beacon": AgentDefinition(
        id="ops_beacon",
        name="ReportBeacon",
        code_name="RB-04",
        title="Operations Reporting & Analytics Agent",
        tagline="The Reporting & Analytics Oracle: Synthesizes live fleet telemetry, margin leaks, and executive KPI briefs on the Report Console.",
        category="Operations Reporting & Business Intelligence",
        color_theme="purple",
        icon_name="BarChart3",
        avatar_url="/agents/report_beacon.svg",
        specialization="Tenant-wide operational metrics, reconciliation health, and executive briefing synthesis for the Report Console",
        reconciles_records=["invoice", "service_ticket", "load_record", "dispatch_record"],
        exception_types_handled=["all_operational_exceptions"],
        key_metrics={
            "accuracy_rate": "99.9%",
            "avg_generation_time": "1.4s",
            "kpi_categories_analyzed": "14 core metrics",
            "active_status": "Active & Publishing to Report Console",
        },
        capabilities=[
            "Powers the Operations Report Console with Live Telemetry",
            "Automated Operations Daily & Weekly Executive Briefings",
            "Total Financial Leakage & Recovered Dollar Tally",
            "Facility & Station Scale Discrepancy Breakdown",
            "Customer SLA & Repeat Billing Offender Risk Scoring",
        ],
        simple_summary="Instead of operations managers spending hours assembling spreadsheets for leadership, ReportBeacon analyzes all operational data across the company in seconds. It calculates overall reconciliation health, highlights where money is leaking, ranks which landfill scale has the most errors, and generates live executive reports on the Report Console ready for leadership.",
        full_tutorial=[
            {
                "step": 1,
                "title": "The Reporting Bottleneck in Operations",
                "explanation": "Operations executives need to know: Are we leaking money? Which landfill has bad scale calibration? Which customers complain most? Pulling this from multiple databases and ERPs takes days of manual spreadsheet work.",
                "papers_compared": ["All Invoices, Tickets, Scale Slips, and Audit Logs"],
            },
            {
                "step": 2,
                "title": "What ReportBeacon Does Automatically",
                "explanation": "ReportBeacon aggregates the entire operational dataset in real time. It groups errors by severity, sums at-risk discrepancy dollars, measures average agent confidence, and calculates the overall Reconciliation Health Percentage.",
                "papers_compared": ["Tenant Record Totals", "Discrepancy Breakdown", "Resolution Velocities"],
            },
            {
                "step": 3,
                "title": "The Outcome: Live Report Console",
                "explanation": "ReportBeacon continuously publishes clean executive briefings, interactive charts, and facility breakdown matrices directly to the Report Console with actionable next steps.",
                "papers_compared": ["Executive Summary Report", "Report Console Analytics"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "ob_daily_brief",
                "title": "Daily Morning Operations & Revenue Leak Brief",
                "period": "Last 24 Hours",
                "total_records_analyzed": 142,
                "health_score": "87.5%",
                "leakage_identified": "$1,115.00",
                "recommended_actions": 4,
            },
        ],
    ),
    "dispute_shield": AgentDefinition(
        id="dispute_shield",
        name="DisputeShield",
        code_name="DS-05",
        title="Customer Dispute Resolution Agent",
        tagline="The Trust Arbitrator: Resolving client billing disputes with certified proof and polite letters.",
        category="Customer Experience & Accounts Receivable",
        color_theme="rose",
        icon_name="ShieldAlert",
        avatar_url="/agents/dispute_shield.svg",
        specialization="Customer dispute arbitration, evidence package compilation, and customer explanation letters",
        reconciles_records=["invoice", "service_ticket", "load_record", "customer_account"],
        exception_types_handled=["customer_disputes", "rate_mismatch", "quantity_mismatch"],
        key_metrics={
            "accuracy_rate": "99.1%",
            "avg_draft_time": "1.8s",
            "dispute_retention_rate": "96.4%",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "Multi-Document Evidence Packet Compilation (Driver Ticket + Scale Receipt + GPS Timestamp)",
            "Dispute Legitimacy Evaluation (Determines if client has valid claim or company is correct)",
            "Polite, Professional Customer Resolution Letter Drafting with Verified Citations",
            "Fair Compromise / Credit Adjustment Recommendation for Human Approval",
        ],
        simple_summary="When an angry customer calls saying: 'You overcharged me on trash weight!' or 'You billed me for a pickup that never happened!', accounts payable freezes the payment. DisputeShield gathers the driver's signed ticket and the official landfill scale receipt, reviews the claim, drafts a courteous customer letter with proof attached, and suggests a fair adjustment.",
        full_tutorial=[
            {
                "step": 1,
                "title": "The Customer Dispute Crisis",
                "explanation": "When an enterprise client disputes an invoice, they often freeze payment on the ENTIRE monthly bill (often $50,000+). Finding the driver ticket, getting the scale slip, and writing a diplomatic response can take customer service 3 to 5 business days.",
                "papers_compared": ["Customer Dispute Email / Ticket", "Monthly Invoice In Question"],
            },
            {
                "step": 2,
                "title": "What DisputeShield Does Automatically",
                "explanation": "DisputeShield matches the disputed haul to the exact signed driver ticket and certified scale slip. It compares the customer's claim against certified records to evaluate whether the dispute is justified.",
                "papers_compared": ["Signed Proof of Service", "Disposal Scale Ticket Slip", "Customer Claim"],
            },
            {
                "step": 3,
                "title": "The Outcome & Business Benefit",
                "explanation": "DisputeShield produces a customer-ready resolution letter citing certified receipts, prepares a credit memo if justified, and speeds dispute turnaround from 5 days to 2 minutes, protecting customer relationships.",
                "papers_compared": ["Courteous Customer Explanation Letter", "Credit Adjustment Payload"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "ds_tonnage_protest",
                "title": "Client Protests Extra Tonnage Fee ($140.00)",
                "customer": "Apex Manufacturing Corp",
                "claim": "Customer states they only loaded 4 tons into compactor, but invoice billed for 6.8 tons.",
                "verified_facts": "Service ticket estimated 6.8 tons, but certified scale ticket SC-110 recorded 4.0 tons.",
                "verdict": "Dispute Validated (Hauler overbilled based on estimate)",
                "recommended_action": "Issue $140.00 Credit Memo and transmit polite apology letter with scale slip SC-110 attached.",
            },
            {
                "scenario_id": "ds_missed_haul_claim",
                "title": "Client Claims Missed Service on Construction Site",
                "customer": "Summit Construction Ltd",
                "claim": "Client claims rolloff dumpster was never picked up on Oct 14th.",
                "verified_facts": "Driver ticket TKT-4411 was signed by site manager 'J. Miller' on Oct 14 at 10:42 AM with photo confirmation.",
                "verdict": "Dispute Denied (Service fully rendered)",
                "recommended_action": "Transmit polite affirmation letter with copy of signed ticket TKT-4411 and driver time log.",
            },
        ],
    ),
}

def get_all_agents() -> list[dict[str, Any]]:
    """Return serialized list of all 5 agent definitions."""
    from agentic.app.agents.minion_chat import MINION_PROFILES
    return [
        {
            "id": a.id,
            "name": a.name,
            "code_name": a.code_name,
            "title": a.title,
            "tagline": a.tagline,
            "category": a.category,
            "color_theme": a.color_theme,
            "icon_name": a.icon_name,
            "avatar_url": a.avatar_url,
            "specialization": a.specialization,
            "reconciles_records": a.reconciles_records,
            "exception_types_handled": a.exception_types_handled,
            "key_metrics": a.key_metrics,
            "capabilities": a.capabilities,
            "simple_summary": a.simple_summary,
            "sample_scenarios": a.sample_scenarios,
            "agent_profile": a.minion_profile or MINION_PROFILES.get(a.id, {}),
            "minion_profile": a.minion_profile or MINION_PROFILES.get(a.id, {}),
        }
        for a in AGENTS_REGISTRY.values()
    ]

def get_agent_definition(agent_id: str) -> AgentDefinition | None:
    if agent_id == "report_beacon":
        agent_id = "ops_beacon"
    defn = AGENTS_REGISTRY.get(agent_id)
    if defn and not defn.minion_profile:
        from agentic.app.agents.minion_chat import MINION_PROFILES
        defn.minion_profile = MINION_PROFILES.get(defn.id, {})
    return defn

