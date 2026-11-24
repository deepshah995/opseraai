"""Unified Dispatcher for the 5 Manufacturing Operations Swarm Agents.

Routes execution requests to BOMGuard, CostSentry, LinePulse, QualityShield, or PlantBeacon.
"""

import logging
from typing import Any

from agentic.app.agents.bom_guard import BOMGuardAgent
from agentic.app.agents.cost_sentry import CostSentryAgent
from agentic.app.agents.line_pulse import LinePulseAgent
from agentic.app.agents.plant_beacon import PlantBeaconAgent
from agentic.app.agents.quality_shield import QualityShieldAgent
from agentic.app.agents.registry import (
    AGENTS_REGISTRY,
    canonical_agent_id,
    get_agent_definition,
)

logger = logging.getLogger(__name__)


class OperationsAgentDispatcher:
    @classmethod
    def execute_agent(
        cls,
        agent_id: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute a designated manufacturing swarm agent with structured inputs."""
        canon_id = canonical_agent_id(agent_id)
        defn = get_agent_definition(canon_id)
        if not defn:
            raise ValueError(
                f"Unknown agent: {agent_id}. Available: {list(AGENTS_REGISTRY.keys())}"
            )

        logger.info(f"Dispatching task to Antigravity Swarm agent: {defn.name} ({canon_id})")

        if canon_id == "bom_guard":
            tkt = params.get("ticket_record") or {}
            scale = params.get("scale_record")
            exc = params.get("exception_data")
            if not tkt:
                tkt = {
                    "external_reference": "WO-4410",
                    "customer_reference": "Apex Precision Metals",
                    "quantity": 6.8,
                    "unit": "tons",
                    "rate": 50.0,
                }
                scale = {
                    "external_reference": "RCV-110",
                    "quantity": 4.0,
                    "unit": "tons",
                }
            return BOMGuardAgent.resolve_material_discrepancy(tkt, scale, exc)

        if canon_id == "line_pulse":
            disp = params.get("dispatch_record") or {}
            tkt = params.get("ticket_record") or {}
            exc = params.get("exception_data")
            if not disp:
                disp = {
                    "external_reference": "SCH-2026-001",
                    "customer_reference": "Summit Hydraulics Ltd",
                    "service_date": "2026-10-14",
                    "normalized_data": {"machine_cell": "CNC-CELL-01"},
                }
                tkt = {
                    "external_reference": "WO-4411",
                    "customer_reference": "Summit Hydraulics Ltd",
                    "service_date": "2026-10-14",
                    "normalized_data": {"machine_cell": "CNC-CELL-03"},
                }
            return LinePulseAgent.resolve_schedule_exception(disp, tkt, exc)

        if canon_id == "cost_sentry":
            invoices = params.get("invoice_records") or []
            tickets = params.get("ticket_records") or []
            exc_type = params.get("exception_type") or "rate_mismatch"
            exc = params.get("exception_data")
            if not invoices and not tickets:
                invoices = [
                    {
                        "external_reference": "INV-9021",
                        "customer_reference": "Titanium Steel Supply",
                        "amount": 350.0,
                    }
                ]
                tickets = [
                    {
                        "external_reference": "PO-4411",
                        "customer_reference": "Titanium Steel Supply",
                        "amount": 275.0,
                        "quantity": 1.0,
                        "rate": 275.0,
                    }
                ]
            return CostSentryAgent.investigate_billing_discrepancy(
                invoices, tickets, exc_type, exc
            )

        if canon_id == "plant_beacon":
            org_name = params.get("organization_name") or "Apex Precision Manufacturing"
            records = params.get("records") or []
            exceptions = params.get("exceptions") or []
            timeframe = params.get("timeframe") or "Last 30 Days"
            return PlantBeaconAgent.generate_operations_report(
                org_name, records, exceptions, timeframe
            )

        if canon_id == "quality_shield":
            cust_name = params.get("customer_name") or "Apex Precision Metals"
            claim = (
                params.get("dispute_claim")
                or "Vendor billed 6.8 tons of stock but receiving slip RCV-110 recorded 4.0 tons."
            )
            inv_ref = params.get("disputed_invoice_ref") or "INV-9020"
            amt = float(params.get("disputed_amount") or 140.0)
            related = params.get("related_records") or [
                {
                    "record_type": "service_ticket",
                    "external_reference": "WO-4410",
                    "quantity": 6.8,
                    "unit": "tons",
                    "rate": 50.0,
                },
                {
                    "record_type": "load_record",
                    "external_reference": "RCV-110",
                    "quantity": 4.0,
                    "unit": "tons",
                },
            ]
            return QualityShieldAgent.resolve_quality_or_dispute(
                cust_name, claim, inv_ref, amt, related
            )

        raise ValueError(f"Agent {agent_id} implementation not found.")
