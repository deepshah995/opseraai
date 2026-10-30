"""Unified Dispatcher for the 5 AI Operations Agents.

Routes execution requests to TicketHawk, DispatchPulse, BillSentry, ReportBeacon, or DisputeShield.
"""

import logging
from typing import Any

from agentic.app.agents.bill_sentry import BillSentryAgent
from agentic.app.agents.dispatch_pulse import DispatchPulseAgent
from agentic.app.agents.dispute_shield import DisputeShieldAgent
from agentic.app.agents.ops_beacon import OpsBeaconAgent
from agentic.app.agents.registry import AGENTS_REGISTRY, get_agent_definition
from agentic.app.agents.ticket_hawk import TicketHawkAgent

logger = logging.getLogger(__name__)

class OperationsAgentDispatcher:
    @classmethod
    def execute_agent(
        cls,
        agent_id: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute a designated agent with structured inputs."""
        defn = get_agent_definition(agent_id)
        if not defn:
            raise ValueError(f"Unknown agent: {agent_id}. Available: {list(AGENTS_REGISTRY.keys())}")

        logger.info(f"Dispatching task to agent: {defn.name} ({agent_id})")

        if agent_id == "ticket_hawk":
            tkt = params.get("ticket_record") or {}
            scale = params.get("scale_record")
            exc = params.get("exception_data")
            # If empty records provided, check for sample scenario fallback
            if not tkt:
                tkt = {
                    "external_reference": "TKT-4410",
                    "customer_reference": "Apex Manufacturing Corp",
                    "quantity": 6.8,
                    "unit": "tons",
                    "rate": 50.0,
                }
                scale = {
                    "external_reference": "SC-110",
                    "quantity": 4.0,
                    "unit": "tons",
                }
            return TicketHawkAgent.resolve_ticket_discrepancy(tkt, scale, exc)

        elif agent_id == "dispatch_pulse":
            disp = params.get("dispatch_record") or {}
            tkt = params.get("ticket_record") or {}
            exc = params.get("exception_data")
            if not disp:
                disp = {
                    "external_reference": "DISP-2024-001",
                    "customer_reference": "Summit Construction Ltd",
                    "service_date": "2024-10-14",
                    "normalized_data": {"truck_id": "TRUCK-12"},
                }
                tkt = {
                    "external_reference": "TKT-4411",
                    "customer_reference": "Summit Construction Ltd",
                    "service_date": "2024-10-14",
                    "normalized_data": {"truck_id": "TRUCK-05"},
                }
            return DispatchPulseAgent.resolve_dispatch_exception(disp, tkt, exc)

        elif agent_id == "bill_sentry":
            invoices = params.get("invoice_records") or []
            tickets = params.get("ticket_records") or []
            exc_type = params.get("exception_type") or "rate_mismatch"
            exc = params.get("exception_data")
            if not invoices and not tickets:
                invoices = [{
                    "external_reference": "INV-9021",
                    "customer_reference": "Summit Construction Ltd",
                    "amount": 350.0,
                }]
                tickets = [{
                    "external_reference": "TKT-4411",
                    "customer_reference": "Summit Construction Ltd",
                    "amount": 275.0,
                    "quantity": 1.0,
                    "rate": 275.0,
                }]
            return BillSentryAgent.investigate_billing_discrepancy(invoices, tickets, exc_type, exc)

        elif agent_id in ("ops_beacon", "report_beacon"):
            org_name = params.get("organization_name") or "Apex Industrial Waste & Recycling"
            records = params.get("records") or []
            exceptions = params.get("exceptions") or []
            timeframe = params.get("timeframe") or "Last 30 Days"
            return OpsBeaconAgent.generate_operations_report(org_name, records, exceptions, timeframe)

        elif agent_id == "dispute_shield":
            cust_name = params.get("customer_name") or "Apex Manufacturing Corp"
            claim = params.get("dispute_claim") or "Customer claims they were billed for 6.8 tons but only produced 4.0 tons."
            inv_ref = params.get("disputed_invoice_ref") or "INV-9020"
            amt = float(params.get("disputed_amount") or 140.0)
            related = params.get("related_records") or [
                {
                    "record_type": "service_ticket",
                    "external_reference": "TKT-4410",
                    "quantity": 6.8,
                    "unit": "tons",
                    "rate": 50.0,
                },
                {
                    "record_type": "load_record",
                    "external_reference": "SC-110",
                    "quantity": 4.0,
                    "unit": "tons",
                },
            ]
            return DisputeShieldAgent.resolve_customer_dispute(cust_name, claim, inv_ref, amt, related)

        raise ValueError(f"Agent {agent_id} implementation not found.")
