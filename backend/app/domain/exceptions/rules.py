from dataclasses import dataclass, field
from typing import Any


@dataclass
class DetectedExceptionData:
    exception_type: str
    title: str
    description: str
    severity: str
    discrepancy_amount: float | None
    related_record_ids: list[str]
    confidence: float
    metadata: dict[str, Any] = field(default_factory=dict)

def calculate_severity(discrepancy_amount: float | None, exception_type: str) -> str:
    """Determine operational severity based on financial risk and exception class."""
    if exception_type == "duplicate_billing":
        return "critical"
    if discrepancy_amount is None:
        return "low"
    abs_amt = abs(discrepancy_amount)
    if abs_amt >= 1000.0:
        return "critical"
    elif abs_amt >= 250.0:
        return "high"
    elif abs_amt >= 50.0:
        return "medium"
    return "low"

class ReconciliationRules:
    RATE_TOLERANCE_USD = 0.05
    QUANTITY_TOLERANCE = 0.01

    @classmethod
    def check_rate_amount_mismatch(
        cls,
        invoice_record: dict[str, Any],
        ticket_record: dict[str, Any],
    ) -> DetectedExceptionData | None:
        inv_amt = invoice_record.get("amount")
        ticket_amt = ticket_record.get("amount")
        ticket_rate = ticket_record.get("rate")
        ticket_qty = ticket_record.get("quantity")

        expected_amt = ticket_amt
        if expected_amt is None and ticket_rate is not None and ticket_qty is not None:
            expected_amt = round(ticket_rate * ticket_qty, 2)

        if inv_amt is not None and expected_amt is not None:
            diff = round(inv_amt - expected_amt, 2)
            if abs(diff) > cls.RATE_TOLERANCE_USD:
                cust = invoice_record.get("customer_reference") or ticket_record.get("customer_reference") or "Unknown"
                title = f"Invoice vs Ticket Amount Mismatch ({cust}): {invoice_record.get('external_reference')} / {ticket_record.get('external_reference')}"
                desc = (
                    f"Invoice {invoice_record.get('external_reference')} bills ${inv_amt:.2f}, "
                    f"but Service Ticket {ticket_record.get('external_reference')} recorded amount is "
                    f"${expected_amt:.2f} (diff: ${diff:+.2f}). "
                    f"Ticket details: rate=${ticket_rate or 0:.2f}, qty={ticket_qty or 0:.2f} {ticket_record.get('unit') or ''}."
                )
                severity = calculate_severity(diff, "rate_mismatch")
                return DetectedExceptionData(
                    exception_type="rate_mismatch",
                    title=title,
                    description=desc,
                    severity=severity,
                    discrepancy_amount=abs(diff),
                    related_record_ids=[invoice_record["id"], ticket_record["id"]],
                    confidence=0.98,
                    metadata={"invoice_amount": inv_amt, "expected_amount": expected_amt, "variance": diff},
                )
        return None

    @classmethod
    def check_quantity_weight_mismatch(
        cls,
        ticket_or_invoice: dict[str, Any],
        scale_or_dispatch: dict[str, Any],
    ) -> DetectedExceptionData | None:
        billed_qty = ticket_or_invoice.get("quantity")
        actual_qty = scale_or_dispatch.get("quantity")

        if billed_qty is not None and actual_qty is not None:
            qty_diff = round(billed_qty - actual_qty, 3)
            if abs(qty_diff) > cls.QUANTITY_TOLERANCE:
                rate = ticket_or_invoice.get("rate") or 50.0  # fallback base rate
                financial_impact = round(qty_diff * rate, 2)
                title = (
                    f"Quantity Discrepancy: {ticket_or_invoice.get('external_reference')} vs "
                    f"{scale_or_dispatch.get('external_reference')}"
                )
                desc = (
                    f"Billed/Recorded quantity on {ticket_or_invoice.get('external_reference')} is {billed_qty:.2f} "
                    f"{ticket_or_invoice.get('unit') or 'units'}, but scale/load ticket "
                    f"{scale_or_dispatch.get('external_reference')} logged {actual_qty:.2f} "
                    f"{scale_or_dispatch.get('unit') or 'units'} (diff: {qty_diff:+.2f}). "
                    f"Estimated financial variance: ${financial_impact:+.2f}."
                )
                severity = calculate_severity(financial_impact, "quantity_mismatch")
                return DetectedExceptionData(
                    exception_type="quantity_mismatch",
                    title=title,
                    description=desc,
                    severity=severity,
                    discrepancy_amount=abs(financial_impact),
                    related_record_ids=[ticket_or_invoice["id"], scale_or_dispatch["id"]],
                    confidence=0.95,
                    metadata={"billed_quantity": billed_qty, "actual_quantity": actual_qty, "quantity_diff": qty_diff},
                )
        return None

    @classmethod
    def check_dispatch_ticket_discrepancy(
        cls,
        dispatch_record: dict[str, Any],
        ticket_record: dict[str, Any],
    ) -> DetectedExceptionData | None:
        disp_date = dispatch_record.get("service_date")
        tkt_date = ticket_record.get("service_date")

        discrepancies = []
        if disp_date and tkt_date:
            disp_str = str(disp_date)[:10]
            tkt_str = str(tkt_date)[:10]
            if disp_str != tkt_str:
                discrepancies.append(f"Date mismatch: Dispatched {disp_str} vs Ticket {tkt_str}")

        disp_meta = dispatch_record.get("normalized_data") or {}
        tkt_meta = ticket_record.get("normalized_data") or {}

        if disp_meta.get("truck_id") and tkt_meta.get("truck_id") and disp_meta["truck_id"] != tkt_meta["truck_id"]:
            discrepancies.append(f"Truck ID mismatch: Dispatched {disp_meta['truck_id']} vs Ticket {tkt_meta['truck_id']}")

        if discrepancies:
            title = f"Dispatch vs Ticket Discrepancy: {dispatch_record.get('external_reference')} / {ticket_record.get('external_reference')}"
            desc = f"Operational disagreement between dispatch log and field ticket: {'; '.join(discrepancies)}."
            return DetectedExceptionData(
                exception_type="dispatch_discrepancy",
                title=title,
                description=desc,
                severity="medium" if len(discrepancies) > 1 else "low",
                discrepancy_amount=0.0,
                related_record_ids=[dispatch_record["id"], ticket_record["id"]],
                confidence=0.92,
                metadata={"discrepancies": discrepancies},
            )
        return None
