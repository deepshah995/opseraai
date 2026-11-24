"""Stateless + DB-backed interactive Ops Audit Preview builder for manufacturing prospects."""

from __future__ import annotations

import json
import logging
import re
from urllib.parse import urlparse

from backend.app.db.models.preview import ProspectPreview
from backend.app.schemas.preview import (
    ProspectAgentPlan,
    ProspectPreviewCreate,
    ProspectPreviewFinding,
    ProspectPreviewResponse,
)
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

DEFAULT_SIMULATION_NOTICE = (
    "Interactive Simulation Mode: Scenarios and dollar figures below are illustrative "
    "benchmarks modeled on your shop's public operational profile. Your 14-day audit uses "
    "read-only CSV/Google Sheets exports from your own ERP."
)

DEFAULT_PILOT_PLAN: list[dict[str, str]] = [
    {
        "phase": "Days 1–3 · Read-Only Sidecar Connect",
        "detail": (
            "Drop 2 weeks of read-only PO, invoice, receiving/scrap, or work-order CSVs "
            "(or Google Sheets) into Opsera — zero ERP code changes or write permissions."
        ),
    },
    {
        "phase": "Days 4–9 · Swarm Rule Calibration",
        "detail": (
            "BOMGuard, CostSentry, LinePulse & QualityShield cross-check vendor price creep, "
            "material/BOM variance, schedule drift, and compliance packet gaps."
        ),
    },
    {
        "phase": "Days 10–14 · Verified ROI Briefing",
        "detail": (
            "Review verified caught dollars ($) and reclaimed engineering/QA hours in a side-by-side "
            "approval queue and PlantBeacon executive Google Doc before deciding on rollout."
        ),
    },
]

_SYSTEM_PATTERNS: list[tuple[str, tuple[str, ...]]] = [
    ("MIE Trak Pro ERP", ("mie trak", "mie solutions")),
    ("JETCAM Nesting", ("jetcam",)),
    ("SYSCON PlantStar MES", ("plantstar", "syscon")),
    ("COAST CMMS", ("coast systems", "cmms")),
    ("DelmiaWorks (IQMS)", ("delmiaworks", "iqms")),
    ("EDI & Barcode Traceability", ("edi", "barcod")),
    ("ERP / MRP & Quoting Sheets", ("erp", "quoting", "estimat", "spreadsheet", "excel")),
]

_COMPLIANCE_PATTERNS: list[tuple[str, tuple[str, ...]]] = [
    ("AS9100", ("as9100",)),
    ("ITAR / CMMC 2.0", ("itar", "cmmc")),
    ("IATF 16949", ("iatf 16949",)),
    ("Nadcap (AC7004 / NDT)", ("nadcap",)),
    ("ISO 9001:2015", ("iso 9001",)),
    ("ISO 14001", ("iso 14001",)),
    ("Class 7 Cleanroom", ("cleanroom", "14644")),
    ("PPAP / FPIR / 8D", ("ppap", "fpir", "8d")),
    ("CWB Welding", ("cwb",)),
]


def normalize_preview_slug(raw_value: str) -> str:
    """Normalize a domain, URL, or slug into a safe lowercase URL slug."""
    raw = (raw_value or "").strip().lower()
    if not raw:
        return "custom-plant"
    if "://" in raw or "." in raw:
        candidate = raw if "://" in raw else f"https://{raw}"
        parsed = urlparse(candidate)
        host = (parsed.hostname or "").strip().lower().removeprefix("www.")
        for tld in (".com", ".ca", ".net", ".org", ".io", ".us", ".co", ".biz"):
            if host.endswith(tld):
                host = host[: -len(tld)]
                break
        if host:
            raw = host
    slug = re.sub(r"[^a-z0-9-]+", "-", raw).strip("-")
    if slug.endswith(("-com", "-net", "-org")):
        slug = slug[:-4]
    elif slug.endswith(("-ca", "-io", "-us")):
        slug = slug[:-3]
    return (slug[:80] or "custom-plant").strip("-")


def detect_erp_and_compliance(text_corpus: str) -> tuple[list[str], list[str]]:
    """Extract observed ERP/MES software and compliance standards from signal text."""
    lower = (text_corpus or "").lower()
    systems = [label for label, keys in _SYSTEM_PATTERNS if any(k in lower for k in keys)]
    if not systems:
        systems = ["Existing Plant ERP / MRP", "Shop-Floor Logs & Spreadsheets"]
    certs = [label for label, keys in _COMPLIANCE_PATTERNS if any(k in lower for k in keys)]
    return systems[:5], certs[:5]


_SEEDED_RAW: dict[str, dict] = {
    "macfab": {
        "slug": "macfab",
        "domain": "macfab.ca",
        "company_name": "Macfab Manufacturing Inc.",
        "subsector": "Precision CNC Machining & Cleanroom Assembly",
        "location": "Mississauga, ON",
        "erp_stack": ["Plant ERP / Quoting", "VMI & Outside-Process Logs", "CMM & Cleanroom QA Logs"],
        "compliance_tags": ["AS9100", "ISO 9001:2015", "ISO 14644-1 Class 7 Cleanroom"],
        "executive_hook": (
            "Cut quoting-to-cleanroom bottlenecks across 53+ CNC centers without disrupting existing ERP workflows."
        ),
        "observed_signals": [
            "42,000+ sq. ft. Mississauga facility running 53+ CNC mills/lathes within Ben Machine Products group",
            "End-to-end scope spans machining, Class 7 cleanroom assembly, helium leak testing, VMI & external plating",
            "6–8 week standard turnaround pressure plus active hiring for Estimators and Afternoon/Weekend QA Inspectors",
        ],
        "top_opportunities": [
            "Automate AS9100 FAI, helium-leak & back-to-birth cleanroom compliance packets (QualityShield)",
            "Monitor exotic alloy VMI & subcontracted plating lead-times/POs before stalls hit 4-week targets (BOMGuard)",
            "Bridge overflow scheduling visibility across 53+ CNC cells & sister Ben Machine sites (LinePulse)",
        ],
        "agent_deployments": [
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "AS9100 Back-to-Birth & Cleanroom QA",
                "workflow_hook": "Auto-compile CMM logs, material certs, and helium leak/off-gas sign-offs per work order.",
                "est_hours_saved_month": 46.0,
            },
            {
                "agent_id": "bom_guard",
                "agent_name": "BOMGuard",
                "code_name": "BG-01",
                "focus": "Outside-Process Plating & Exotic Alloy VMI",
                "workflow_hook": "Flag late subcontract certs, material lot variances, and VMI min-max drift early.",
                "est_hours_saved_month": 32.0,
            },
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "Multi-Shift CNC & Overflow Sync",
                "workflow_hook": "Keep day/weekend shift work-order handoffs aligned across 53+ CNC centers.",
                "est_hours_saved_month": 28.0,
            },
            {
                "agent_id": "cost_sentry",
                "agent_name": "CostSentry",
                "code_name": "CS-02",
                "focus": "Subcontract PO & Quote-to-Actual Margin Audit",
                "workflow_hook": "Catch plating/finishing rate creep and unbilled rush expediting before invoicing.",
                "est_hours_saved_month": 24.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "Outside-Process Anodizing Lot Delayed + Rate Variance vs Blanket PO",
                "agent_name": "CostSentry",
                "exception_type": "rate_mismatch",
                "estimated_monthly_impact_usd": 3420.0,
                "reclaimed_hours_month": 18.0,
                "source_systems": ["Vendor Blanket PO Export", "AP Invoice PDF"],
                "summary": "Matched subcontract finishing invoices against contracted tier rates to flag unapproved setup surcharges.",
            },
            {
                "issue_title": "Incomplete Cleanroom Certs Holding Finished CNC Medical Assembly Batch",
                "agent_name": "QualityShield",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 4800.0,
                "reclaimed_hours_month": 26.0,
                "source_systems": ["CMM Inspection CSV", "Cleanroom Lot Log"],
                "summary": "Pre-assembled complete AS9100 back-to-birth packet and flagged 1 missing mill heat certificate ahead of shipment.",
            },
            {
                "issue_title": "Exotic Titanium Bar Stock Short-Received vs Receiving Scale Log",
                "agent_name": "BOMGuard",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 2150.0,
                "reclaimed_hours_month": 14.0,
                "source_systems": ["Dock Receiving CSV", "ERP PO Receipt"],
                "summary": "Cross-checked mill packing slip net weight against ERP receipt to catch short-shipped alloy stock.",
            },
        ],
        "est_monthly_savings_usd": 10370.0,
        "est_monthly_hours_saved": 130.0,
    },
    "fourmark": {
        "slug": "fourmark",
        "domain": "fourmark.com",
        "company_name": "Fourmark Manufacturing Inc.",
        "subsector": "Custom Plastic Injection Molding & Packaging",
        "location": "Oakville, ON",
        "erp_stack": ["SYSCON PlantStar MES", "COAST CMMS", "Purchasing & Accounting Sheets"],
        "compliance_tags": ["ISO Food & Medical Packaging", "Bio-Resin Lot Traceability", "J.I.T. Guarantee"],
        "executive_hook": (
            "Bridge SYSCON PlantStar OEE logs, COAST maintenance events, and J.I.T. purchasing automatically—zero manual re-keying."
        ),
        "observed_signals": [
            "High-automation Oakville plant running robotics, in-mold labeling (IML), vision inspection, and Spoon-In-Lid lines",
            "Runs SYSCON PlantStar MES and COAST CMMS alongside a lean cross-functional operations & supply-chain team",
            "Tight On-Time Just-In-Time (J.I.T.) delivery guarantee across bio-resin and food/medical runs",
        ],
        "top_opportunities": [
            "Sync PlantStar press OEE & COAST CMMS downtime directly with J.I.T. delivery & resin reorders (LinePulse)",
            "Reconcile bio-resin & IML film consumption vs. BOM targets to catch scrap & lot variances (BOMGuard)",
            "Audit supplier resin pricing & rush freight surcharges across food/pharma orders (CostSentry)",
        ],
        "agent_deployments": [
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "PlantStar MES ↔ COAST CMMS ↔ J.I.T. Schedule",
                "workflow_hook": "Surface press downtime & vision reject spikes before J.I.T. promises slip.",
                "est_hours_saved_month": 38.0,
            },
            {
                "agent_id": "bom_guard",
                "agent_name": "BOMGuard",
                "code_name": "BG-01",
                "focus": "Bio-Resin & IML Film Consumption",
                "workflow_hook": "Compare PlantStar shot counts + lot scales vs. ERP BOM resin allocations.",
                "est_hours_saved_month": 30.0,
            },
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "Food/Pharma Traceability & Vision Audit Packets",
                "workflow_hook": "Bundle bio-resin lot certs + vision reject logs cleanly for QA audits.",
                "est_hours_saved_month": 22.0,
            },
            {
                "agent_id": "cost_sentry",
                "agent_name": "CostSentry",
                "code_name": "CS-02",
                "focus": "Resin Supplier PO 3-Way Match",
                "workflow_hook": "Catch resin surcharge creep and mold-maintenance billing variances.",
                "est_hours_saved_month": 20.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "IML Bio-Resin Lot Consumption +7.8% Above Mold BOM Standard",
                "agent_name": "BOMGuard",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 3890.0,
                "reclaimed_hours_month": 16.0,
                "source_systems": ["SYSCON PlantStar Shot Log", "Resin Silo / Lot Sheet"],
                "summary": "Detected recurring purge & startup scrap drift on Press #14 ahead of weekly purchasing reconciliation.",
            },
            {
                "issue_title": "Scheduled Preventive Mold Maintenance Overlapping J.I.T. Customer Release",
                "agent_name": "LinePulse",
                "exception_type": "dispatch_discrepancy",
                "estimated_monthly_impact_usd": 2900.0,
                "reclaimed_hours_month": 22.0,
                "source_systems": ["COAST CMMS Export", "J.I.T. Dispatch Schedule"],
                "summary": "Flagged mold tooling PM conflict 48 hours prior so scheduling shifted work order to alternate press.",
            },
            {
                "issue_title": "Supplier Additive Invoice Billed Above Contracted Tier Rate",
                "agent_name": "CostSentry",
                "exception_type": "rate_mismatch",
                "estimated_monthly_impact_usd": 1740.0,
                "reclaimed_hours_month": 12.0,
                "source_systems": ["Vendor PO Log", "Accounts Payable Export"],
                "summary": "Caught unapproved resin colorant unit-price bump before monthly AP settlement.",
            },
        ],
        "est_monthly_savings_usd": 8530.0,
        "est_monthly_hours_saved": 110.0,
    },
    "bmpmetals": {
        "slug": "bmpmetals",
        "domain": "bmpmetals.com",
        "company_name": "BMP Metals Inc.",
        "subsector": "Custom Precision Sheet Metal Fabrication",
        "location": "Brampton, ON",
        "erp_stack": ["MIE Trak Pro ERP", "JETCAM Expert Nesting", "Bempro Intercompany Orders"],
        "compliance_tags": ["ISO 9001:2015", "CWB Certified Welding"],
        "executive_hook": (
            "Extend MIE Trak Pro + JETCAM with automated downstream WIP & cost-leak checks across Bempro Global Group."
        ),
        "observed_signals": [
            "160,000 sq. ft. two-building Brampton campus operating within Bempro Global Group (CableTalk, ClimateWorx)",
            "Runs MIE Trak Pro ERP (with Engineering Change Requests) integrated with JETCAM Expert nesting",
            "Vertically integrated through laser, forming, CWB welding, CNC, wet/powder paint & electromechanical assembly",
        ],
        "top_opportunities": [
            "Spot downstream bottlenecks & ECR router drift past laser/JETCAM across welding, paint & assembly (LinePulse)",
            "Audit MIE Trak Pro intercompany kitting, sheet remnant allocation & hardware BOMs (BOMGuard)",
            "Catch supplier finishing/coatings PO creep & unbilled ECR rush charges cleanly (CostSentry)",
        ],
        "agent_deployments": [
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "MIE Trak Pro ↔ Welding, Paint & Assembly WIP",
                "workflow_hook": "Flag stalled low-volume custom jobs between JETCAM laser nests and downstream cells.",
                "est_hours_saved_month": 42.0,
            },
            {
                "agent_id": "cost_sentry",
                "agent_name": "CostSentry",
                "code_name": "CS-02",
                "focus": "MIE Trak Pro 3-Way PO & ECR Cost Capture",
                "workflow_hook": "Ensure Engineering Change Request revisions flow into vendor PO checks & customer billing.",
                "est_hours_saved_month": 34.0,
            },
            {
                "agent_id": "bom_guard",
                "agent_name": "BOMGuard",
                "code_name": "BG-01",
                "focus": "Intercompany Kitting & Sheet/Hardware Variances",
                "workflow_hook": "Verify CableTalk & ClimateWorx shared material allocations match MIE Trak Pro routers.",
                "est_hours_saved_month": 30.0,
            },
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "ISO 9001 & CWB Cert Packet Automation",
                "workflow_hook": "Link CWB weld certs, paint thickness logs & heat numbers to MIE Trak Pro work orders.",
                "est_hours_saved_month": 26.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "MIE Trak Pro ECR Revision Left Out of Downstream Powder-Coat Vendor PO",
                "agent_name": "CostSentry",
                "exception_type": "unbilled_job",
                "estimated_monthly_impact_usd": 4120.0,
                "reclaimed_hours_month": 20.0,
                "source_systems": ["MIE Trak Pro ECR Export", "Subcontract PO Sheet"],
                "summary": "Caught revision-C bracket masking changes performed on the floor that missed customer quote adjustment.",
            },
            {
                "issue_title": "JETCAM Laser Nest Completed, Work Order Stalled 4 Days Before CWB Weld Bay",
                "agent_name": "LinePulse",
                "exception_type": "dispatch_discrepancy",
                "estimated_monthly_impact_usd": 3100.0,
                "reclaimed_hours_month": 24.0,
                "source_systems": ["JETCAM Completion Log", "MIE Trak Pro Workcenters"],
                "summary": "Flagged intercompany enclosure subassembly sitting unlogged between Forming Bay 2 and CWB Weld.",
            },
            {
                "issue_title": "Stainless Coil Weight Variance vs Receiving Dock Scale on Mill PO #4418",
                "agent_name": "BOMGuard",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 2480.0,
                "reclaimed_hours_month": 16.0,
                "source_systems": ["Receiving Scale CSV", "MIE Trak Pro PO Receipt"],
                "summary": "Identified 4.6% net gauge-weight shortage against mill invoice before AP release.",
            },
        ],
        "est_monthly_savings_usd": 9700.0,
        "est_monthly_hours_saved": 132.0,
    },
    "brannonsteel": {
        "slug": "brannonsteel",
        "domain": "brannonsteel.com",
        "company_name": "Brannon Steel",
        "subsector": "Metal Fabrication & Custom Steel Parts Manufacturing",
        "location": "Brampton, ON",
        "erp_stack": ["Integrated Steel ERP + EDI", "Barcoded Heat-Lot Tracking", "20 kW Laser & Plasma Cell Logs"],
        "compliance_tags": ["ISO 9001", "ISO 14001", "PPAP / FPIR / 8D", "KanBan / JIT"],
        "executive_hook": (
            "Unify 24/5 multi-plant steel scheduling, direct-mill PO audits, and PPAP/8D packets across 3 Brampton sites."
        ),
        "observed_signals": [
            "200,000+ sq. ft. across 3 Brampton plants running 24/5 shifts with 6 fiber lasers (including 20 kW Bystronic) & plasma beveling",
            "Recent $2.55M equipment expansion + FedDev Ontario investment scaling cutting & forming capacity",
            "Heavy OEM KanBan/JIT commitments using direct mill buying, EDI releases, barcoding, and PPAP/FPIR/8D quality",
        ],
        "top_opportunities": [
            "Reconcile direct-mill plate POs, barcoded heat remnants & cutting nests without stockout surprises (BOMGuard)",
            "Catch mill surcharge drift, duplicate freight bills & EDI release discrepancies automatically (CostSentry)",
            "Automate day-to-night shift handoff alerts across 3 Brampton sites for JIT/KanBan orders (LinePulse)",
        ],
        "agent_deployments": [
            {
                "agent_id": "cost_sentry",
                "agent_name": "CostSentry",
                "code_name": "CS-02",
                "focus": "Direct-Mill POs & Freight Surcharge Audits",
                "workflow_hook": "Verify mill plate invoices, alloy surcharges & EDI releases match contracted price books.",
                "est_hours_saved_month": 38.0,
            },
            {
                "agent_id": "bom_guard",
                "agent_name": "BOMGuard",
                "code_name": "BG-01",
                "focus": "Barcoded Heat-Lot & Plate Remnant Traceability",
                "workflow_hook": "Track mill weight slips against barcoded plate remnants across all 3 sites.",
                "est_hours_saved_month": 36.0,
            },
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "24/5 Multi-Plant Laser/Plasma/Roll Handoffs",
                "workflow_hook": "Keep afternoon & night shift operators aligned on KanBan/JIT priorities.",
                "est_hours_saved_month": 32.0,
            },
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "Automated PPAP / FPIR / 8D Quality Packages",
                "workflow_hook": "Assemble mill heat certs + barcoded inspection logs into OEM-ready PPAP folders.",
                "est_hours_saved_month": 28.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "Direct-Mill Plate Invoice Alloy Surcharge Exceeds Quarterly Contract Cap",
                "agent_name": "CostSentry",
                "exception_type": "rate_mismatch",
                "estimated_monthly_impact_usd": 5640.0,
                "reclaimed_hours_month": 22.0,
                "source_systems": ["Direct Mill Contract Rate Sheet", "Mill AP Invoice"],
                "summary": "Flagged 3.4% fuel & scrap surcharge variance across 14 heavy-plate deliveries.",
            },
            {
                "issue_title": "Night-Shift Laser Cell Cut Cancelled KanBan Line Due to Late EDI Sync",
                "agent_name": "LinePulse",
                "exception_type": "dispatch_discrepancy",
                "estimated_monthly_impact_usd": 3250.0,
                "reclaimed_hours_month": 20.0,
                "source_systems": ["EDI Customer Release", "Bystronic Cell Schedule"],
                "summary": "Caught EDI quantity reduction between office close and 11pm shift start before nesting consumed plate.",
            },
            {
                "issue_title": "Missing Mill Heat Cert Link on PPAP Packet for Heavy-Equipment OEM",
                "agent_name": "QualityShield",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 2100.0,
                "reclaimed_hours_month": 18.0,
                "source_systems": ["Barcode Heat-Lot Log", "PPAP Checklist Sheet"],
                "summary": "Auto-matched mill test report PDF to barcoded skid #BR-9921 before shipping dock release.",
            },
        ],
        "est_monthly_savings_usd": 10990.0,
        "est_monthly_hours_saved": 134.0,
    },
    "dishoncnc": {
        "slug": "dishoncnc",
        "domain": "dishoncnc.com",
        "company_name": "Dishon Limited",
        "subsector": "Precision CNC Machining & Complex Assemblies",
        "location": "Vaughan, ON & Orlando, FL",
        "erp_stack": ["Multi-Site ERP / Work Orders", "CMM Inspection Data", "Tool Crib & Sub-Tier Logs"],
        "compliance_tags": ["AS9100", "ITAR", "Aerospace & Defense Propulsion"],
        "executive_hook": (
            "Free up scarce CNC machinists & QA engineers across 80+ machines and the new 30k sq. ft. Vaughan expansion."
        ),
        "observed_signals": [
            "80+ CNC machines across 3 Vaughan plants + $7.5M FedDev-backed 30,000 sq. ft. aerospace facility + Orlando USA site",
            "Leadership explicitly noted skilled-trades & CNC programmer/inspector staffing as top scaling constraint",
            "High-mix aerospace, propulsion, nuclear & sub-sea components requiring strict AS9100 / ITAR FAI packets",
        ],
        "top_opportunities": [
            "Automate AS9100/ITAR FAI packets & CMM data rollups to reclaim Quality Engineer hours (QualityShield)",
            "Synchronize tool-crib, kitting & cross-site capacity across Vaughan + Orlando (LinePulse)",
            "Audit multi-tier outside-process invoices & complex assembly job costs automatically (CostSentry)",
        ],
        "agent_deployments": [
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "AS9100 / ITAR FAI & CMM Packet Automation",
                "workflow_hook": "Convert CMM outputs & lot traceability directly into inspection packets—saving QA hours.",
                "est_hours_saved_month": 52.0,
            },
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "Vaughan + Orlando Multi-Plant & Tool Crib Sync",
                "workflow_hook": "Eliminate manual cross-site kitting handoffs across 80+ CNC work centers.",
                "est_hours_saved_month": 40.0,
            },
            {
                "agent_id": "cost_sentry",
                "agent_name": "CostSentry",
                "code_name": "CS-02",
                "focus": "Sub-Tier Machining & NDT Invoice Audits",
                "workflow_hook": "Catch duplicate outside-processing invoices and unbilled engineering change setups.",
                "est_hours_saved_month": 28.0,
            },
            {
                "agent_id": "bom_guard",
                "agent_name": "BOMGuard",
                "code_name": "BG-01",
                "focus": "High-Mix Kit Shortage & Tooling Variance",
                "workflow_hook": "Prevent assembly stalls from missing sub-tier hardware or calibration holds.",
                "est_hours_saved_month": 26.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "Duplicate Outside-Process NDT & Passivation Charge Across Kit Lot #DH-884",
                "agent_name": "CostSentry",
                "exception_type": "duplicate_billing",
                "estimated_monthly_impact_usd": 4450.0,
                "reclaimed_hours_month": 16.0,
                "source_systems": ["ERP Subcontract Receipt", "Vendor AP Ledger"],
                "summary": "Identified same aerospace rocket-propulsion batch billed under two separate packing slip refs.",
            },
            {
                "issue_title": "First Article Inspection Sign-Offs Scattered Across 3 Spreadsheets in Vaughan",
                "agent_name": "QualityShield",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 3900.0,
                "reclaimed_hours_month": 34.0,
                "source_systems": ["CMM Program Export", "Material Cert Archive"],
                "summary": "Consolidated aerospace AS9100 FAI package automatically ahead of Orlando final assembly.",
            },
            {
                "issue_title": "Unbilled Setup & Tooling Rework on Rushed Sub-Sea Assembly Engineering Rev",
                "agent_name": "LinePulse",
                "exception_type": "unbilled_job",
                "estimated_monthly_impact_usd": 2950.0,
                "reclaimed_hours_month": 22.0,
                "source_systems": ["CNC Run Log", "Customer Change Order"],
                "summary": "Surfaced 14.5 machine hours on revised tolerance run not yet reflected in billing schedule.",
            },
        ],
        "est_monthly_savings_usd": 11300.0,
        "est_monthly_hours_saved": 146.0,
    },
    "worldtek-ind": {
        "slug": "worldtek-ind",
        "domain": "worldtek-ind.com",
        "company_name": "World Tek Industries",
        "subsector": "Precision CNC Machining & Metal Fabrication",
        "location": "Romulus, Michigan",
        "erp_stack": ["Multi-Shift ERP / Estimating", "CMM Inspection Logs", "Weld & Heat Stress-Relief Logs"],
        "compliance_tags": ["AS9100 Rev D", "ISO 9001:2015", "ITAR", "CMMC 2.0 Level 2"],
        "executive_hook": (
            "Protect 1-business-day quote turnarounds and AS9100/CMMC compliance packets across multi-shift Romulus cells."
        ),
        "observed_signals": [
            "105,000 sq. ft. Romulus facility combining CNC machining, certified welding, stress relief, forming & painting",
            "Holds AS9100 Rev D, ISO 9001:2015, ITAR, and CMMC 2.0 Level 2 compliance across defense & aerospace",
            "Commits to ~1-business-day quote turnarounds while hiring across 1st/2nd shifts, CMM & Account Managers",
        ],
        "top_opportunities": [
            "Auto-build AS9100/ITAR/CMMC cert & stress-relief weld packets directly from shop logs (QualityShield)",
            "Sync multi-shift CNC, weld, forming, paint & CMM queues to prevent late handoffs (LinePulse)",
            "Audit quote-vs-actual cycle cost & vendor finishing invoices across 1st/2nd shifts (CostSentry)",
        ],
        "agent_deployments": [
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "AS9100 / ITAR / CMMC Shipment Cert Packets",
                "workflow_hook": "Compile weld logs, furnace stress-relief charts & CMM reports per shipment automatically.",
                "est_hours_saved_month": 44.0,
            },
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "Multi-Shift CNC → Weld → CMM Queue Visibility",
                "workflow_hook": "Flag stalled cross-department handoffs between 1st and 2nd shift cell leads.",
                "est_hours_saved_month": 36.0,
            },
            {
                "agent_id": "cost_sentry",
                "agent_name": "CostSentry",
                "code_name": "CS-02",
                "focus": "Rapid-Quote Variance & Supplier Invoice Audit",
                "workflow_hook": "Compare 1-day engineering quotes against actual weld/machining hours & vendor bills.",
                "est_hours_saved_month": 26.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "Quote Underestimated Stress-Relief & Paint Prep Hours on Multi-Process Assembly",
                "agent_name": "CostSentry",
                "exception_type": "rate_mismatch",
                "estimated_monthly_impact_usd": 3650.0,
                "reclaimed_hours_month": 18.0,
                "source_systems": ["Estimating Sheet", "2nd-Shift Job Cost Log"],
                "summary": "Highlighted recurring margin variance on formed-and-welded brackets for next quoting cycle.",
            },
            {
                "issue_title": "Furnace Stress-Relief Chart & CMM Report Missing Link Before ITAR Dispatch",
                "agent_name": "QualityShield",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 4100.0,
                "reclaimed_hours_month": 28.0,
                "source_systems": ["Heat-Treat Chart PDF", "CMM Inspection Export"],
                "summary": "Matched serial numbers across weld and inspection sheets in seconds instead of manual binder review.",
            },
        ],
        "est_monthly_savings_usd": 7750.0,
        "est_monthly_hours_saved": 106.0,
    },
    "styberg": {
        "slug": "styberg",
        "domain": "styberg.com",
        "company_name": "Styberg Engineering",
        "subsector": "Precision CNC Machining & Custom Metal Fabrication",
        "location": "Racine, Wisconsin",
        "erp_stack": ["Plant ERP / Routing", "Multi-Step Stamping & Heat Treat Logs", "Nadcap Quality Systems"],
        "compliance_tags": ["Nadcap (Welding, NDT, AC7004)", "ISO 9001:2015", "IATF 16949"],
        "executive_hook": (
            "Unify multi-step stamping, Grob spline forming, heat-treat WIP, and Nadcap/IATF 16949 traceability under one audit sidecar."
        ),
        "observed_signals": [
            "175,000 sq. ft. ESOP facility (~150 employees) uniting 1,000-ton stamping, CNC, laser welding, heat treat & Grob forming",
            "New executive team scaling robotics, conveyor automation, and AI evaluation across complex OEM routings",
            "Maintains Nadcap (Welding, NDT, Aerospace Quality AC7004), ISO 9001:2015 & IATF 16949 compliance",
        ],
        "top_opportunities": [
            "Automate Nadcap AC7004 / IATF 16949 traceability across multi-process routings (QualityShield)",
            "Eliminate WIP blind spots between stamping, heat-treat, laser weld & finishing cells (LinePulse)",
            "Catch BOM scrap drift & die/heat-treat routing cost overruns before period close (BOMGuard & CostSentry)",
        ],
        "agent_deployments": [
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "Nadcap AC7004 / NDT & IATF 16949 Traceability",
                "workflow_hook": "Connect heat-treat, weld NDT & dimensional inspection records into audit-ready packets.",
                "est_hours_saved_month": 48.0,
            },
            {
                "agent_id": "bom_guard",
                "agent_name": "BOMGuard",
                "code_name": "BG-01",
                "focus": "Stamping Scrap & Multi-Step Routing Variances",
                "workflow_hook": "Detect blanking/coil scrap drift and heat-treat yield loss across long OEM routings.",
                "est_hours_saved_month": 32.0,
            },
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "Workcenter WIP Visibility (1,000T Press → CNC)",
                "workflow_hook": "Spot queued WIP delays between stamping, Grob cold-forming & grinding bays.",
                "est_hours_saved_month": 30.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "Heavy-Press Coil Consumption Exceeding Routing Standard Across Batch #SY-408",
                "agent_name": "BOMGuard",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 4650.0,
                "reclaimed_hours_month": 19.0,
                "source_systems": ["Coil Receiving Log", "Press Stamping Yield CSV"],
                "summary": "Quantified exact edge-trim & setup scrap variance on 1,000-ton stamping run for engineering review.",
            },
            {
                "issue_title": "Unmatched NDT Inspection Cert Holding Heat-Treated Aerospace Spline Lot",
                "agent_name": "QualityShield",
                "exception_type": "dispatch_discrepancy",
                "estimated_monthly_impact_usd": 3800.0,
                "reclaimed_hours_month": 26.0,
                "source_systems": ["Heat-Treat Lot Log", "Nadcap NDT Sign-Off Sheet"],
                "summary": "Pre-assembled complete AC7004 packet and alerted QA lead automatically before dock release.",
            },
        ],
        "est_monthly_savings_usd": 8450.0,
        "est_monthly_hours_saved": 110.0,
    },
    "prd-inc": {
        "slug": "prd-inc",
        "domain": "prd-inc.com",
        "company_name": "PRD, Inc.",
        "subsector": "Custom Plastic Injection Molding & Assembly",
        "location": "Springville, Indiana",
        "erp_stack": ["DelmiaWorks (IQMS) ERP/MES", "Yushin 5-Axis Robotics Logs", "D&M Tool Corp. Tooling Sync"],
        "compliance_tags": ["IATF 16949", "ISO 14001", "ITAR Drone/Defense", "ISO/IEC 17025 Lab"],
        "executive_hook": (
            "Cut manual DelmiaWorks (IQMS) shop-floor data entry while gating ITAR defense & sister-plant tooling handoffs."
        ),
        "observed_signals": [
            "72,000 sq. ft. plant running DelmiaWorks (IQMS) alongside 20–610T Toshiba electric presses & Yushin robotics",
            "Shop-floor job postings cite manual IQMS data entry & work-order navigation friction for technicians/handlers",
            "Scaling into ITAR defense/drones, EV battery & data-center runs alongside sister toolmaker D&M Tool Corp.",
        ],
        "top_opportunities": [
            "Eliminate manual DelmiaWorks work-order, resin lot & cycle reconciliation (LinePulse & BOMGuard)",
            "Connect in-house 3D-scan/LED lab & ISO 17025 calibration into IATF/ITAR compliance packets (QualityShield)",
            "Track sister-company D&M Tool Corp. tooling milestones vs. press launch POs (CostSentry)",
        ],
        "agent_deployments": [
            {
                "agent_id": "line_pulse",
                "agent_name": "LinePulse",
                "code_name": "LP-03",
                "focus": "DelmiaWorks (IQMS) Shop-Floor Work-Order Sync",
                "workflow_hook": "Cross-check Toshiba press cycles & secondary assembly vs. IQMS work-order statuses.",
                "est_hours_saved_month": 44.0,
            },
            {
                "agent_id": "quality_shield",
                "agent_name": "QualityShield",
                "code_name": "QS-04",
                "focus": "IATF 16949 / ITAR & ISO 17025 Metrology Packets",
                "workflow_hook": "Bind 3D-scan metrology & gage calibration statuses directly to production lots.",
                "est_hours_saved_month": 34.0,
            },
            {
                "agent_id": "bom_guard",
                "agent_name": "BOMGuard",
                "code_name": "BG-01",
                "focus": "Resin Lot Movement & Runner/Scrap Audits",
                "workflow_hook": "Catch material handler IQMS lot-entry mismatches before inventory counts drift.",
                "est_hours_saved_month": 28.0,
            },
        ],
        "simulated_findings": [
            {
                "issue_title": "DelmiaWorks Resin Lot Transfer Missed on Night Shift Secondary Assembly Run",
                "agent_name": "BOMGuard",
                "exception_type": "quantity_mismatch",
                "estimated_monthly_impact_usd": 3180.0,
                "reclaimed_hours_month": 20.0,
                "source_systems": ["DelmiaWorks (IQMS) Lot Export", "Press Floor Material Sheet"],
                "summary": "Caught unposted resin lot transfer saving 6+ hours of manual month-end physical cycle reconciliation.",
            },
            {
                "issue_title": "Secondary Sonic-Weld Cell Completed Rush Batch Marked Open in IQMS",
                "agent_name": "LinePulse",
                "exception_type": "unbilled_job",
                "estimated_monthly_impact_usd": 2750.0,
                "reclaimed_hours_month": 18.0,
                "source_systems": ["Assembly Cell Log", "DelmiaWorks Work Orders"],
                "summary": "Synced robot/secondary assembly counts directly against IQMS work order for timely invoicing.",
            },
        ],
        "est_monthly_savings_usd": 5930.0,
        "est_monthly_hours_saved": 106.0,
    },
}


def _to_preview_response(raw: dict) -> ProspectPreviewResponse:
    return ProspectPreviewResponse(
        slug=raw["slug"],
        domain=raw["domain"],
        company_name=raw["company_name"],
        subsector=raw["subsector"],
        location=raw["location"],
        erp_stack=list(raw.get("erp_stack") or []),
        compliance_tags=list(raw.get("compliance_tags") or []),
        executive_hook=raw["executive_hook"],
        observed_signals=list(raw.get("observed_signals") or []),
        top_opportunities=list(raw.get("top_opportunities") or []),
        agent_deployments=[ProspectAgentPlan(**a) for a in (raw.get("agent_deployments") or [])],
        simulated_findings=[
            ProspectPreviewFinding(**f, is_simulated=True)
            for f in (raw.get("simulated_findings") or [])
        ],
        est_monthly_savings_usd=float(raw.get("est_monthly_savings_usd") or 0.0),
        est_monthly_hours_saved=float(raw.get("est_monthly_hours_saved") or 0.0),
        pilot_plan=list(raw.get("pilot_plan") or DEFAULT_PILOT_PLAN),
        simulation_notice=raw.get("simulation_notice") or DEFAULT_SIMULATION_NOTICE,
    )


SEEDED_PROSPECT_PREVIEWS: dict[str, ProspectPreviewResponse] = {
    slug: _to_preview_response(payload) for slug, payload in _SEEDED_RAW.items()
}


def build_deterministic_preview_from_payload(req: ProspectPreviewCreate) -> ProspectPreviewResponse:
    """Constructs a tailored read-only Opsera Audit Preview for any discovered manufacturer."""
    slug = normalize_preview_slug(req.slug or req.domain or req.company_name)
    if slug in SEEDED_PROSPECT_PREVIEWS and not req.observed_signals:
        return SEEDED_PROSPECT_PREVIEWS[slug]

    corpus = "\n".join(
        [
            req.company_name,
            req.subsector,
            req.location,
            *(req.observed_signals or []),
            *(req.top_opportunities or []),
        ]
    )
    erp_stack, compliance_tags = detect_erp_and_compliance(corpus)
    clean_domain = req.domain.strip().lower().removeprefix("https://").removeprefix("http://").removeprefix("www.").split("/")[0]

    signals = [str(s).strip() for s in (req.observed_signals or []) if str(s).strip()][:5]
    if not signals:
        signals = [
            f"{req.subsector} manufacturer operating in {req.location or 'North America'}",
            f"Core workflows run across {', '.join(erp_stack[:2])}",
        ]

    opps = [str(o).strip() for o in (req.top_opportunities or []) if str(o).strip()][:4]
    if not opps:
        opps = [
            "3-way PO, receiving scale & supplier invoice reconciliation without ERP replacement (CostSentry & BOMGuard)",
            "Shop-floor cell schedule sync & compliance packet assembly (LinePulse & QualityShield)",
        ]

    agent_deployments = [
        ProspectAgentPlan(
            agent_id="bom_guard",
            agent_name="BOMGuard",
            code_name="BG-01",
            focus="Receiving Weights, Raw Material & BOM Variances",
            workflow_hook=f"Cross-check receiving slips & material consumption against {erp_stack[0]} routers.",
            est_hours_saved_month=32.0,
        ),
        ProspectAgentPlan(
            agent_id="cost_sentry",
            agent_name="CostSentry",
            code_name="CS-02",
            focus="3-Way PO Rate Creep & Duplicate Invoices",
            workflow_hook="Catch vendor price drift, duplicate bills, and unbilled work orders prior to AP/AR close.",
            est_hours_saved_month=30.0,
        ),
        ProspectAgentPlan(
            agent_id="line_pulse",
            agent_name="LinePulse",
            code_name="LP-03",
            focus="Shop-Floor Workcenter & Shift Handoff Sync",
            workflow_hook=f"Surface stalled {req.subsector.lower()} jobs between office schedules and shop cells.",
            est_hours_saved_month=28.0,
        ),
        ProspectAgentPlan(
            agent_id="quality_shield",
            agent_name="QualityShield",
            code_name="QS-04",
            focus=(f"{compliance_tags[0]} & Supplier NCR Packets" if compliance_tags else "QA & Supplier NCR Evidence Packets"),
            workflow_hook="Compile heat certs, inspection outputs, and vendor chargeback proof in 1 click.",
            est_hours_saved_month=24.0,
        ),
    ]

    findings = [
        ProspectPreviewFinding(
            issue_title=f"Vendor Unit-Rate & Surcharge Drift vs Contracted PO at {req.company_name}",
            agent_name="CostSentry",
            exception_type="rate_mismatch",
            estimated_monthly_impact_usd=3250.0,
            reclaimed_hours_month=16.0,
            source_systems=[erp_stack[0], "Supplier Invoice Export"],
            summary="Sample benchmark: catches unapproved raw-material or subcontract surcharges before AP release.",
        ),
        ProspectPreviewFinding(
            issue_title="Receiving Weight / BOM Scrap Consumption Variance Outside Tolerance",
            agent_name="BOMGuard",
            exception_type="quantity_mismatch",
            estimated_monthly_impact_usd=2840.0,
            reclaimed_hours_month=18.0,
            source_systems=["Receiving Dock Scale Log", "Work Order BOM Sheet"],
            summary="Sample benchmark: flags short deliveries and excess material pulls before margin erodes.",
        ),
        ProspectPreviewFinding(
            issue_title=f"Completed Shop-Floor Batch Missing Downstream Closeout in {erp_stack[0]}",
            agent_name="LinePulse",
            exception_type="unbilled_job",
            estimated_monthly_impact_usd=2150.0,
            reclaimed_hours_month=14.0,
            source_systems=["Shop-Floor Production Log", erp_stack[0]],
            summary="Sample benchmark: eliminates manual morning spreadsheet reconciliation between shifts.",
        ),
    ]

    return ProspectPreviewResponse(
        slug=slug,
        domain=clean_domain or slug,
        company_name=req.company_name.strip(),
        subsector=req.subsector.strip() or "Precision Manufacturing",
        location=req.location.strip() or "North America",
        erp_stack=erp_stack,
        compliance_tags=compliance_tags,
        executive_hook=(
            f"Run Opsera as a zero-disruption read-only sidecar over {req.company_name}'s "
            f"{erp_stack[0]} workflows—catching cost leaks & QA bottlenecks in 14 days."
        ),
        observed_signals=signals,
        top_opportunities=opps,
        agent_deployments=agent_deployments,
        simulated_findings=findings,
        est_monthly_savings_usd=8240.0,
        est_monthly_hours_saved=114.0,
        pilot_plan=DEFAULT_PILOT_PLAN,
        simulation_notice=DEFAULT_SIMULATION_NOTICE,
    )


def resolve_preview_by_slug(db: Session, raw_slug: str) -> ProspectPreviewResponse | None:
    """Resolve a prospect preview from database first, then stateless seeded catalog."""
    slug = normalize_preview_slug(raw_slug)
    row = db.query(ProspectPreview).filter(ProspectPreview.slug == slug).first()
    if row is not None:
        try:
            data = json.loads(row.payload_json)
            return ProspectPreviewResponse.model_validate(data)
        except Exception as exc:
            logger.warning("Stored preview payload invalid for slug %s: %s", slug, exc)
    return SEEDED_PROSPECT_PREVIEWS.get(slug)


def upsert_prospect_preview(db: Session, req: ProspectPreviewCreate) -> ProspectPreviewResponse:
    """Create or update a persisted prospect audit preview from lead intelligence."""
    slug = normalize_preview_slug(req.slug or req.domain or req.company_name)
    seeded = SEEDED_PROSPECT_PREVIEWS.get(slug)
    if seeded is not None and not req.observed_signals:
        preview = seeded
    elif seeded is not None:
        generated = build_deterministic_preview_from_payload(req)
        preview = seeded.model_copy(
            update={
                "observed_signals": generated.observed_signals or seeded.observed_signals,
                "top_opportunities": generated.top_opportunities or seeded.top_opportunities,
            }
        )
    else:
        preview = build_deterministic_preview_from_payload(req)

    payload_json = preview.model_dump_json()
    existing = db.query(ProspectPreview).filter(ProspectPreview.slug == preview.slug).first()
    if existing:
        existing.domain = preview.domain
        existing.company_name = preview.company_name
        existing.subsector = preview.subsector
        existing.location = preview.location
        existing.payload_json = payload_json
    else:
        db.add(
            ProspectPreview(
                slug=preview.slug,
                domain=preview.domain,
                company_name=preview.company_name,
                subsector=preview.subsector,
                location=preview.location,
                payload_json=payload_json,
            )
        )
    db.commit()
    return preview
