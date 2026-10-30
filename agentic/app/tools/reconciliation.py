from typing import Any


def compute_variance_breakdown(
    billed_amount: float | None,
    expected_amount: float | None,
    billed_quantity: float | None = None,
    actual_quantity: float | None = None,
    unit_rate: float | None = None,
) -> dict[str, Any]:
    """
    Deterministic mathematical variance calculation.
    Computes absolute difference, percentage variance, and quantity/rate breakdown.
    """
    amt_diff = 0.0
    pct_variance = 0.0
    if billed_amount is not None and expected_amount is not None:
        amt_diff = round(billed_amount - expected_amount, 2)
        if expected_amount != 0:
            pct_variance = round((amt_diff / expected_amount) * 100.0, 2)

    qty_diff = 0.0
    if billed_quantity is not None and actual_quantity is not None:
        qty_diff = round(billed_quantity - actual_quantity, 3)

    calculated_expected_from_qty = None
    if actual_quantity is not None and unit_rate is not None:
        calculated_expected_from_qty = round(actual_quantity * unit_rate, 2)

    return {
        "billed_amount": billed_amount,
        "expected_amount": expected_amount,
        "amount_difference": amt_diff,
        "percentage_variance": pct_variance,
        "billed_quantity": billed_quantity,
        "actual_quantity": actual_quantity,
        "quantity_difference": qty_diff,
        "unit_rate": unit_rate,
        "calculated_expected_from_qty": calculated_expected_from_qty,
        "is_overbilled": amt_diff > 0.05,
        "is_underbilled": amt_diff < -0.05,
    }
