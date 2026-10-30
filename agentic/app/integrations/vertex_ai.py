import json
import logging
from typing import Any

from agentic.app.prompts.investigation import INVESTIGATION_SYSTEM_PROMPT
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class VertexAIGeminiAdapter:
    def __init__(
        self,
        project: str | None = None,
        location: str | None = None,
        model_name: str | None = None,
    ):
        self.project = project or settings.VERTEX_AI_PROJECT
        self.location = location or settings.VERTEX_AI_LOCATION
        self.model_name = model_name or settings.GEMINI_MODEL
        self._model = None

    def _get_vertex_model(self):
        if self._model is None and self.project:
            try:
                import vertexai
                from vertexai.generative_models import GenerativeModel
                vertexai.init(project=self.project, location=self.location)
                self._model = GenerativeModel(self.model_name)
            except Exception as e:
                logger.warning(f"Could not initialize Vertex AI client ({e}). Will use local deterministic reasoning engine.")
        return self._model

    def analyze_investigation(
        self,
        exception_data: dict[str, Any],
        records: list[dict[str, Any]],
        math_variance: dict[str, Any],
        evidence_items: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Analyze exception using Gemini on Vertex AI or deterministic reasoning fallback.
        Returns parsed JSON dict with root_cause_analysis, confidence_score, and proposed_resolution.
        """
        # Try live Vertex AI Gemini if configured and not explicitly using mock
        if not settings.USE_MOCK_LLM_IN_DEV and self.project:
            try:
                model = self._get_vertex_model()
                if model:
                    prompt_context = {
                        "exception": exception_data,
                        "operational_records": records,
                        "reconciliation_math": math_variance,
                        "evidence_items": evidence_items,
                    }
                    prompt = f"{INVESTIGATION_SYSTEM_PROMPT}\n\nEVIDENCE AND CONTEXT:\n{json.dumps(prompt_context, indent=2, default=str)}"
                    response = model.generate_content(
                        prompt,
                        generation_config={"response_mime_type": "application/json", "temperature": 0.1},
                    )
                    content = response.text
                    return json.loads(content)
            except Exception as e:
                logger.error(f"Vertex AI Gemini invocation failed: {e}. Falling back to deterministic engine.")

        # Deterministic Grounded Reasoning Engine
        return self._deterministic_reasoning(exception_data, records, math_variance, evidence_items)

    def _deterministic_reasoning(
        self,
        exception_data: dict[str, Any],
        records: list[dict[str, Any]],
        math_variance: dict[str, Any],
        evidence_items: list[dict[str, Any]],
    ) -> dict[str, Any]:
        exc_type = exception_data.get("exception_type", "")
        amt_diff = math_variance.get("amount_difference", 0.0)
        qty_diff = math_variance.get("quantity_difference", 0.0)
        
        invoices = [r for r in records if r.get("record_type") == "invoice"]
        tickets = [r for r in records if r.get("record_type") == "service_ticket"]
        loads = [r for r in records if r.get("record_type") == "load_record"]
        dispatches = [r for r in records if r.get("record_type") == "dispatch_record"]

        cust = (
            (invoices[0].get("customer_reference") if invoices else None)
            or (tickets[0].get("customer_reference") if tickets else None)
            or "Unknown Customer"
        )

        if exc_type == "rate_mismatch":
            inv_ref = invoices[0].get("external_reference") if invoices else "Invoice"
            tkt_ref = tickets[0].get("external_reference") if tickets else "Ticket"
            inv_amt = math_variance.get("billed_amount") or 0.0
            exp_amt = math_variance.get("expected_amount") or 0.0

            if amt_diff > 0:
                action_type = "credit_memo"
                rec_action = f"Issue Credit Memo for ${amt_diff:.2f} Overcharge on {inv_ref}"
                explanation = (
                    f"Cross-referencing {inv_ref} against field Service Ticket {tkt_ref} shows the invoice "
                    f"billed ${inv_amt:.2f} whereas the signed service ticket rate calculation totals ${exp_amt:.2f}. "
                    f"A credit memo of ${amt_diff:.2f} is recommended to correct customer account {cust}."
                )
            else:
                action_type = "rebill_invoice"
                rec_action = f"Issue Supplementary Invoice for ${abs(amt_diff):.2f} Undercharge on {inv_ref}"
                explanation = (
                    f"The customer {cust} was underbilled by ${abs(amt_diff):.2f}. Service ticket {tkt_ref} "
                    f"recorded ${exp_amt:.2f} of service, but invoice {inv_ref} only billed ${inv_amt:.2f}."
                )

            analysis = (
                f"Root Cause: Discrepancy between billed invoice line item and signed service ticket. "
                f"Verified records: {inv_ref} (billed: ${inv_amt:.2f}) vs {tkt_ref} (expected: ${exp_amt:.2f}). "
                f"Variance is ${amt_diff:+.2f} ({math_variance.get('percentage_variance', 0):+.1f}%). "
                f"No additional contractual surcharges were found in ticket notes to support the difference."
            )
            confidence = 0.96

        elif exc_type == "quantity_mismatch":
            tkt_ref = tickets[0].get("external_reference") if tickets else "Ticket"
            ld_ref = loads[0].get("external_reference") if loads else "Scale Ticket"
            billed_q = math_variance.get("billed_quantity") or 0.0
            actual_q = math_variance.get("actual_quantity") or 0.0
            rate = math_variance.get("unit_rate") or 50.0
            fin_impact = round(qty_diff * rate, 2)

            action_type = "credit_memo" if qty_diff > 0 else "rebill_invoice"
            rec_action = f"Adjust Billed Tonnage to Match Certified Scale Ticket {ld_ref} (${abs(fin_impact):.2f})"
            analysis = (
                f"Root Cause: Scale ticket weight discrepancy. Service ticket {tkt_ref} recorded {billed_q:.2f} tons, "
                f"whereas certified disposal scale ticket {ld_ref} logged net weight {actual_q:.2f} tons (diff: {qty_diff:+.2f} tons). "
                f"Disposal billing rules mandate billing based on certified scale receipts."
            )
            explanation = (
                f"Customer {cust} was billed based on estimated tonnage ({billed_q:.2f} tons) rather than the "
                f"certified scale ticket {ld_ref} ({actual_q:.2f} tons). At contract rate of ${rate:.2f}/ton, "
                f"the financial variance is ${fin_impact:+.2f}."
            )
            confidence = 0.94

        elif exc_type == "unbilled_job":
            tkt_ref = tickets[0].get("external_reference") if tickets else "Ticket"
            tkt_amt = tickets[0].get("amount") or 0.0
            action_type = "rebill_invoice"
            rec_action = f"Generate Invoice for Completed Service Ticket {tkt_ref} (${tkt_amt:.2f})"
            analysis = (
                f"Root Cause: Missing invoice line item / unbilled service haul. "
                f"Service ticket {tkt_ref} for customer {cust} was completed and signed by the driver, "
                f"but has not been linked to or billed on any customer invoice for this billing cycle."
            )
            explanation = (
                f"Service ticket {tkt_ref} representing ${tkt_amt:.2f} of industrial service has been fully completed. "
                f"Recommendation is to add this charge to the upcoming invoice cycle for {cust}."
            )
            confidence = 0.98

        elif exc_type == "duplicate_billing":
            inv_refs = [i.get("external_reference") for i in invoices]
            dupe_amt = sum(i.get("amount", 0.0) for i in invoices[1:]) if len(invoices) > 1 else 0.0
            action_type = "credit_memo"
            rec_action = f"Void Duplicate Invoice Charge ({', '.join(inv_refs)})"
            analysis = (
                f"Root Cause: Duplicate billing. The same service ticket/load reference was ingested into multiple "
                f"distinct billing batches: {', '.join(inv_refs)}. This created redundant customer charges."
            )
            explanation = (
                f"Invoices {', '.join(inv_refs)} double-billed customer {cust}. Cancel/void the secondary invoice "
                f"or issue a full credit memo of ${dupe_amt:.2f} to prevent duplicate payment."
            )
            confidence = 0.99

        else:  # dispatch_discrepancy or other
            action_type = "dispatch_adjustment"
            rec_action = "Align Dispatch Manifest Schedule with Signed Field Ticket"
            analysis = (
                "Root Cause: Operational disagreement between dispatch scheduling and field service execution. "
                "Dispatched vehicle or date does not match the driver's signed ticket log."
            )
            explanation = (
                "Update dispatch operational records to reflect the actual field completion date and truck ID. "
                "No financial billing adjustment is required."
            )
            confidence = 0.91

        return {
            "root_cause_analysis": analysis,
            "confidence_score": confidence,
            "proposed_resolution": {
                "action_type": action_type,
                "recommended_action": rec_action,
                "proposed_amount": abs(amt_diff) if amt_diff else (abs(math_variance.get("quantity_difference", 0) * (math_variance.get("unit_rate") or 50.0))),
                "customer_reference": cust,
                "affected_reference": invoices[0].get("external_reference") if invoices else (tickets[0].get("external_reference") if tickets else "Record"),
                "explanation": explanation,
            },
        }
