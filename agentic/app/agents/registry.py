"""Central Registry for the 5 Specialized Manufacturing Operations Swarm Agents.

Defines agent identities, personas, cost/time-saving focus, tutorials, and sample scenarios.
"""

from dataclasses import dataclass, field
from typing import Any

LEGACY_AGENT_ALIASES: dict[str, str] = {
    "ticket_hawk": "bom_guard",
    "dispatch_pulse": "line_pulse",
    "bill_sentry": "cost_sentry",
    "ops_beacon": "plant_beacon",
    "report_beacon": "plant_beacon",
    "dispute_shield": "quality_shield",
}


def canonical_agent_id(agent_id: str) -> str:
    clean = (agent_id or "").strip().lower().replace("-", "_")
    return LEGACY_AGENT_ALIASES.get(clean, clean)


@dataclass
class AgentDefinition:
    id: str
    name: str
    code_name: str
    title: str
    tagline: str
    category: str
    color_theme: str
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
    cost_savings_focus: str = ""
    time_saved_per_task_mins: float = 45.0
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    agent_profile: dict[str, Any] = field(default_factory=dict)


AGENTS_REGISTRY: dict[str, AgentDefinition] = {
    "bom_guard": AgentDefinition(
        id="bom_guard",
        name="BOMGuard",
        code_name="BG-01",
        title="Material & BOM Variance Auditor",
        tagline="Catches raw material shortages, receiving weight variances, and BOM over-consumption before they erode margin.",
        category="Materials & Inventory",
        color_theme="emerald",
        icon_name="Scale",
        avatar_url="/agents/bom_guard.svg",
        specialization="Raw material receiving slips vs PO & Bill-of-Materials usage",
        reconciles_records=["service_ticket", "load_record"],
        exception_types_handled=["quantity_mismatch"],
        cost_savings_focus="Prevents paying for short-shipped steel, resin & billets and stops unallocated BOM scrap.",
        time_saved_per_task_mins=40.0,
        inputs=["Receiving Scale Slips", "Material Issue Tickets", "Google Sheets Receiving Log"],
        outputs=["Shortage Credit Proposal", "BOM Cost Variance Alert"],
        key_metrics={
            "accuracy_rate": "99.4%",
            "avg_resolution_time": "1.2s",
            "recovered_leakage_mtd": "$14,250",
            "hours_saved_mtd": "38 hrs",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "Certified Receiving Dock Scale vs PO / Material Ticket Matching",
            "Bill of Materials (BOM) Consumption Tolerance Auditing",
            "Automatic Unit-Cost Shortage & Scrap Impact Computation",
            "One-Click Inventory Adjustment & Vendor Credit Payload Generation",
        ],
        simple_summary=(
            "When raw aluminum or steel arrives at the plant, the receiving scale weighs the delivery while "
            "the vendor bills the PO estimate. If a supplier short-ships or production pulls excess material "
            "against the BOM, BOMGuard catches the exact variance and prepares the adjustment automatically."
        ),
        full_tutorial=[
            {
                "step": 1,
                "title": "The Hidden Material Margin Leak",
                "explanation": (
                    "Suppliers invoice based on estimated coil or billet weights, while receiving docks weigh "
                    "incoming lots on certified floor scales. Even a 5-10% shortage across daily shipments silently drains thousands."
                ),
                "papers_compared": ["Material Work Order / PO", "Certified Receiving Dock Slip"],
            },
            {
                "step": 2,
                "title": "What BOMGuard Checks Automatically",
                "explanation": (
                    "BOMGuard cross-checks every material receipt against the PO and BOM standard quantity, "
                    "isolates variances above your tolerance threshold, and calculates the exact dollar impact."
                ),
                "papers_compared": ["Receiving Net Weight", "BOM Standard Quantity"],
            },
            {
                "step": 3,
                "title": "Cost & Time Saved for the Plant",
                "explanation": (
                    "Instead of engineers and buyers spending 40 minutes hunting down dock slips, BOMGuard prepares "
                    "a grounded vendor credit or BOM cost adjustment ready for 1-click manager sign-off."
                ),
                "papers_compared": ["Manager 1-Click Approval", "Synced Google Sheet Cost Ledger"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "bg_coil_shortage",
                "title": "Aluminum Billet Receiving Dock Shortage",
                "customer": "Apex Precision Metals",
                "ticket_no": "WO-4410",
                "scale_slip": "RCV-110",
                "ticket_tonnage": 6.8,
                "certified_tonnage": 4.0,
                "contract_rate": 50.0,
                "variance": -2.8,
                "expected_resolution": "Recover $140.00 Vendor Material Shortage Credit on WO-4410",
            },
            {
                "scenario_id": "bg_resin_overage",
                "title": "Injection Molding Resin BOM Over-Consumption",
                "customer": "Metro Polymer Systems",
                "ticket_no": "WO-8821",
                "scale_slip": "RCV-209",
                "ticket_tonnage": 8.0,
                "certified_tonnage": 11.5,
                "contract_rate": 65.0,
                "variance": 3.5,
                "expected_resolution": "Reallocate $227.50 BOM Material Variance on WO-8821",
            },
        ],
    ),
    "cost_sentry": AgentDefinition(
        id="cost_sentry",
        name="CostSentry",
        code_name="CS-02",
        title="Procurement & 3-Way Invoice Auditor",
        tagline="Stops vendor price creep, duplicate invoices, and unbilled finished-goods orders in seconds.",
        category="Procurement & Finance",
        color_theme="amber",
        icon_name="Receipt",
        avatar_url="/agents/cost_sentry.svg",
        specialization="3-way Purchase Order, Work Order, and Invoice reconciliation",
        reconciles_records=["invoice", "service_ticket"],
        exception_types_handled=["rate_mismatch", "unbilled_job", "duplicate_billing"],
        cost_savings_focus="Eliminates AP overpayments, duplicate supplier billing, and unbilled production runs.",
        time_saved_per_task_mins=45.0,
        inputs=["Supplier & Customer Invoices", "Purchase Orders", "Google Sheets AP Export"],
        outputs=["Credit / Void Proposal", "Unbilled Order Capture"],
        key_metrics={
            "accuracy_rate": "99.8%",
            "avg_resolution_time": "1.4s",
            "revenue_leakage_prevented": "$38,900/mo",
            "hours_saved_mtd": "52 hrs",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "3-Way PO Rate vs Billed Invoice Verification",
            "Unbilled Completed Production Batch Detection",
            "Cross-Batch Duplicate Vendor & Customer Invoice Blocking",
            "One-Click Credit Memo & Rebill Payload Staging",
        ],
        simple_summary=(
            "AP teams process hundreds of supplier and customer invoices weekly. A unit-price bump on raw stock, "
            "a duplicate vendor invoice batch, or a shipped custom batch that was never invoiced drains profitability. "
            "CostSentry audits every line item against POs and work orders before cash leaves the plant."
        ),
        full_tutorial=[
            {
                "step": 1,
                "title": "Where Manufacturing Margins Leak",
                "explanation": (
                    "Vendors occasionally invoice above contracted PO unit rates or double-bill a sub-assembly batch. "
                    "Meanwhile, rush custom fabrication orders sometimes ship without making it to billing."
                ),
                "papers_compared": ["Supplier / Customer Invoice", "Contracted Purchase Order"],
            },
            {
                "step": 2,
                "title": "What CostSentry Audits Automatically",
                "explanation": (
                    "CostSentry mathematically checks (Quantity x Agreed Rate) vs billed total, detects duplicate "
                    "invoice batches referencing the same PO/WO, and finds completed work orders with zero invoices."
                ),
                "papers_compared": ["PO Unit Rates", "Invoice Line Items", "Completed Work Orders"],
            },
            {
                "step": 3,
                "title": "Immediate Dollar Recovery",
                "explanation": (
                    "CostSentry packages an instant approval card with exact PO and invoice citations so finance "
                    "managers approve savings in one click."
                ),
                "papers_compared": ["Recovery Proposal", "Manager Sign-Off Gate"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "cs_rate_mismatch",
                "title": "Supplier Unit Price Higher Than Contract PO",
                "customer": "Titanium Steel Supply",
                "invoice_ref": "INV-9021",
                "ticket_no": "PO-4411",
                "billed_amount": 350.0,
                "expected_amount": 275.0,
                "variance": 75.0,
                "expected_resolution": "Save $75.00 via Supplier Credit Memo on INV-9021",
            },
            {
                "scenario_id": "cs_unbilled_batch",
                "title": "Completed CNC Housing Batch Omitted from Billing",
                "customer": "Pacific Robotics Corp",
                "ticket_no": "WO-4413",
                "unbilled_amount": 550.0,
                "status": "completed",
                "expected_resolution": "Capture $550.00 Revenue for Shipped Work Order WO-4413",
            },
            {
                "scenario_id": "cs_duplicate_bill",
                "title": "Duplicate Sub-Assembly Invoice Across Two AP Batches",
                "customer": "Delta Precision Stamping",
                "invoices": ["INV-9021", "INV-9099"],
                "duplicate_amount": 350.0,
                "expected_resolution": "Void Duplicate Invoice INV-9099 to Save $350.00",
            },
        ],
    ),
    "line_pulse": AgentDefinition(
        id="line_pulse",
        name="LinePulse",
        code_name="LP-03",
        title="Production Schedule & Machine Cell Coordinator",
        tagline="Keeps ERP production schedules synced with shop-floor CNC cell swaps, shift shifts, and maintenance hours.",
        category="Shop Floor & Production",
        color_theme="blue",
        icon_name="Truck",
        avatar_url="/agents/line_pulse.svg",
        specialization="ERP production schedule vs shop-floor work order execution",
        reconciles_records=["dispatch_record", "service_ticket"],
        exception_types_handled=["dispatch_discrepancy"],
        cost_savings_focus="Prevents scheduling bottlenecks, unplanned machine downtime, and inaccurate OEE tracking.",
        time_saved_per_task_mins=55.0,
        inputs=["ERP Production Schedule", "Shop-Floor Work Orders", "MES / SQL Machine Logs"],
        outputs=["ERP Routing Sync Update", "Maintenance Hour Correction"],
        key_metrics={
            "accuracy_rate": "98.9%",
            "avg_resolution_time": "0.9s",
            "schedule_divergence_caught": "38 swaps/mo",
            "hours_saved_mtd": "34 hrs",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "Machine Cell / Line Reassignment Detection (e.g. CNC-01 planned vs CNC-03 actual)",
            "Shift Window Drift & Changeover Delay Identification",
            "Work Order Completion Verification without Billing Disruption",
            "Automatic ERP Schedule & Maintenance Hour Alignment",
        ],
        simple_summary=(
            "Production planners schedule a batch on CNC Cell 01, but an unplanned spindle fault forces the floor "
            "lead to run it on Cell 03. LinePulse detects the swap instantly and updates the schedule and machine "
            "maintenance logs so OEE metrics and delivery promises stay accurate."
        ),
        full_tutorial=[
            {
                "step": 1,
                "title": "The Shop-Floor vs ERP Gap",
                "explanation": (
                    "Floor supervisors constantly reroute work orders around tooling changeovers or breakdowns. "
                    "When ERP schedules aren't updated, maintenance intervals and capacity plans go blind."
                ),
                "papers_compared": ["ERP Production Schedule", "Shop-Floor Work Order Completion"],
            },
            {
                "step": 2,
                "title": "What LinePulse Detects",
                "explanation": (
                    "LinePulse compares planned machine cell IDs and target shift dates against actual execution logs, "
                    "confirming customer SLA delivery while isolating routing changes."
                ),
                "papers_compared": ["Planned Cell ID vs Actual Cell ID", "Planned Date vs Completion Date"],
            },
            {
                "step": 3,
                "title": "Zero-Friction Schedule Sync",
                "explanation": (
                    "LinePulse prepares a clean ERP routing update with zero customer billing penalty, saving "
                    "supervisors nearly an hour of manual status reconciliation per swap."
                ),
                "papers_compared": ["Synced ERP Routing", "Preventive Maintenance Accuracy"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "lp_cell_swap",
                "title": "Emergency CNC Cell Reroute (Cell-01 to Cell-03)",
                "customer": "Summit Hydraulics Ltd",
                "dispatch_ref": "SCH-2026-001",
                "ticket_no": "WO-4411",
                "scheduled_truck": "CNC-CELL-01",
                "actual_truck": "CNC-CELL-03",
                "expected_resolution": "Sync ERP Schedule SCH-2026-001 with Shop-Floor Log WO-4411 (CNC-CELL-03)",
            },
        ],
    ),
    "quality_shield": AgentDefinition(
        id="quality_shield",
        name="QualityShield",
        code_name="QS-04",
        title="QC Inspection & Supplier NCR Arbitrator",
        tagline="Turns days of supplier chargeback & customer RMA evidence gathering into one-click verified packets.",
        category="Quality & Compliance",
        color_theme="rose",
        icon_name="ShieldAlert",
        avatar_url="/agents/quality_shield.svg",
        specialization="QC inspection certificates, receiving logs & NCR/RMA letter drafting",
        reconciles_records=["invoice", "service_ticket", "load_record", "customer_account"],
        exception_types_handled=["customer_disputes", "rate_mismatch", "quantity_mismatch"],
        cost_savings_focus="Accelerates supplier defect chargebacks and protects customer accounts with certified QA proof.",
        time_saved_per_task_mins=65.0,
        inputs=["Receiving Scale Slips", "QC Inspection Logs", "Invoice & Lot Claims"],
        outputs=["Supplier NCR / Chargeback Letter", "Credit Memo Proposal"],
        key_metrics={
            "accuracy_rate": "99.1%",
            "avg_draft_time": "1.6s",
            "dispute_retention_rate": "96.4%",
            "hours_saved_mtd": "41 hrs",
            "active_status": "Online & Watching",
        },
        capabilities=[
            "Multi-Record QC Evidence Compilation (Work Order + Scale Receipt + Inspection Log)",
            "Claim Legitimacy Verification Against Certified Plant Records",
            "Professional Supplier NCR / Customer QA Resolution Letter Drafting",
            "Fair Credit or Chargeback Recommendation for Manager Approval",
        ],
        simple_summary=(
            "When a supplier disputes a material shortage or a customer files a quality/billing inquiry, "
            "QualityShield pulls the signed work order and certified receiving slip, verifies the claim, "
            "and drafts the complete NCR or customer response letter in seconds."
        ),
        full_tutorial=[
            {
                "step": 1,
                "title": "Why Claims Freeze Cash Flow",
                "explanation": (
                    "Disputed invoices and vendor defect claims routinely stall payments for days while QA and AP "
                    "dig through binders and spreadsheets to prove what actually shipped or arrived."
                ),
                "papers_compared": ["Supplier / Customer Claim", "Monthly Invoice & Lot Log"],
            },
            {
                "step": 2,
                "title": "Automated Evidence Assembly",
                "explanation": (
                    "QualityShield links the disputed invoice directly to the certified receiving slip and work order "
                    "to verify whether a credit, supplier chargeback, or affirmation applies."
                ),
                "papers_compared": ["Work Order Proof", "Certified Receiving Slip", "Claim Statement"],
            },
            {
                "step": 3,
                "title": "Ready-to-Send Resolution Packet",
                "explanation": (
                    "QualityShield drafts the resolution letter with exact cited IDs and can export it straight to "
                    "Google Docs for manager review."
                ),
                "papers_compared": ["Formatted Google Doc / Letter", "Credit Adjustment"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "qs_lot_shortage",
                "title": "Raw Stock Shortage Chargeback ($140.00)",
                "customer": "Apex Precision Metals",
                "claim": "Vendor invoiced 6.8 tons of steel bar stock, but plant dock scale RCV-110 verified 4.0 tons.",
                "verified_facts": "Work order WO-4410 logged 6.8 tons, certified receiving slip RCV-110 recorded 4.0 tons.",
                "verdict": "Claim Validated — Issue $140.00 Supplier Chargeback / Credit",
                "recommended_action": "Issue $140.00 Credit Adjustment and send NCR notice citing RCV-110.",
            },
            {
                "scenario_id": "qs_shipment_verified",
                "title": "Customer Claims Short Delivery on Machined Brackets",
                "customer": "Summit Hydraulics Ltd",
                "claim": "Customer states batch was missing from Oct 14 shipment.",
                "verified_facts": "Work order WO-4411 was QC-signed and dispatched via verified shipment log.",
                "verdict": "Shipment Affirmed — Service & Quantity Verified",
                "recommended_action": "Send QA affirmation packet with signed inspection log WO-4411.",
            },
        ],
    ),
    "plant_beacon": AgentDefinition(
        id="plant_beacon",
        name="PlantBeacon",
        code_name="PB-05",
        title="Plant ROI & Executive Intelligence Analyst",
        tagline="Tracks cumulative cost savings, hours saved, and plant health—ready to publish to Google Docs & Sheets.",
        category="Plant Intelligence & ROI",
        color_theme="purple",
        icon_name="BarChart3",
        avatar_url="/agents/plant_beacon.svg",
        specialization="Cross-plant KPI synthesis, ROI tracking & Google Docs/Sheets reporting",
        reconciles_records=["invoice", "service_ticket", "load_record", "dispatch_record"],
        exception_types_handled=["all_operational_exceptions"],
        cost_savings_focus="Surfaces plant-wide cost avoidance, recovered leakage, and manual hours eliminated.",
        time_saved_per_task_mins=120.0,
        inputs=["All Swarm Agent Outputs", "Plant Records", "Exceptions & Approvals"],
        outputs=["Executive ROI Briefing", "Google Docs Brief", "Google Sheets KPI Sync"],
        key_metrics={
            "accuracy_rate": "99.9%",
            "avg_generation_time": "1.1s",
            "kpi_categories_analyzed": "14 plant KPIs",
            "hours_saved_mtd": "28 hrs",
            "active_status": "Active & Publishing",
        },
        capabilities=[
            "Live Cost Savings ($) & Hours Saved ROI Quantification",
            "Cross-Plant & Line Discrepancy Breakdown",
            "1-Click Export to Connected Google Docs & Google Sheets",
            "Executive Shift & Weekly Leadership Briefings",
        ],
        simple_summary=(
            "Plant managers shouldn't spend Fridays stitching spreadsheets together. PlantBeacon gathers findings "
            "from BOMGuard, CostSentry, LinePulse, and QualityShield, calculates exact cost and time savings, "
            "and publishes clean executive briefs to your Report Console, Google Docs, and Google Sheets."
        ),
        full_tutorial=[
            {
                "step": 1,
                "title": "Eliminating Manual Plant Reporting",
                "explanation": (
                    "Leadership needs instant visibility into supplier overcharges, scrap leaks, and schedule drifts "
                    "without waiting days for finance and ops to merge CSVs."
                ),
                "papers_compared": ["Invoices, Work Orders, Receiving Slips, Schedules"],
            },
            {
                "step": 2,
                "title": "Real-Time ROI Synthesis",
                "explanation": (
                    "PlantBeacon aggregates dollar savings recovered, at-risk spend remaining, manual hours eliminated, "
                    "and reconciliation health across every production cell."
                ),
                "papers_compared": ["Plant Record Totals", "Exception Breakdown", "Hours Saved Benchmarks"],
            },
            {
                "step": 3,
                "title": "Instant Google Docs & Sheets Sync",
                "explanation": (
                    "Push executive summaries directly to Google Docs or sync tabular savings rows to Google Sheets "
                    "in one click."
                ),
                "papers_compared": ["Google Docs Briefing", "Google Sheets Savings Ledger"],
            },
        ],
        sample_scenarios=[
            {
                "scenario_id": "pb_weekly_roi",
                "title": "Weekly Plant Cost & Time Savings Executive Brief",
                "period": "Last 30 Days",
                "total_records_analyzed": 142,
                "health_score": "89.4%",
                "leakage_identified": "$3,845.00",
                "recommended_actions": 4,
            },
        ],
    ),
}


def get_all_agents() -> list[dict[str, Any]]:
    """Return serialized list of all 5 manufacturing swarm agent definitions."""
    from agentic.app.agents.swarm_chat import AGENT_STUDIO_PROFILES

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
            "cost_savings_focus": a.cost_savings_focus,
            "time_saved_per_task_mins": a.time_saved_per_task_mins,
            "inputs": a.inputs,
            "outputs": a.outputs,
            "key_metrics": a.key_metrics,
            "capabilities": a.capabilities,
            "simple_summary": a.simple_summary,
            "full_tutorial": a.full_tutorial,
            "sample_scenarios": a.sample_scenarios,
            "agent_profile": a.agent_profile or AGENT_STUDIO_PROFILES.get(a.id, {}),
            "minion_profile": a.agent_profile or AGENT_STUDIO_PROFILES.get(a.id, {}),
        }
        for a in AGENTS_REGISTRY.values()
    ]


def get_agent_definition(agent_id: str) -> AgentDefinition | None:
    canon = canonical_agent_id(agent_id)
    defn = AGENTS_REGISTRY.get(canon)
    if defn and not defn.agent_profile:
        from agentic.app.agents.swarm_chat import AGENT_STUDIO_PROFILES

        defn.agent_profile = AGENT_STUDIO_PROFILES.get(defn.id, {})
    return defn
