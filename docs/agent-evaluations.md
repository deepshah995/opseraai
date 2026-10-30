# Agent Evaluation & Grounding Benchmark

This document details the evaluation methodology, benchmark test suites, and grounding criteria for the LangGraph operations exception agent.

---

## 1. Evaluation Dimensions

| Dimension | Target Metric | Verification Method |
| :--- | :--- | :--- |
| **Grounding Accuracy** | 100% | Automated check ensuring every evidence item references a verified DB record ID without hallucinated identifiers. |
| **Mathematical Precision** | 100% | Deterministic Python calculation of variance and percentage difference (zero reliance on LLM arithmetic). |
| **Action Direction Fidelity** | 100% | Overcharges must recommend `credit_memo`; undercharges/unbilled hauls must recommend `rebill_invoice`. |
| **Tenant Isolation** | 100% | Zero evidence items or context leakage across distinct `organization_id` tenants. |
| **Human Review Gating** | 100% | Investigations pause at `human_in_the_loop_gate` requiring explicit manager approval before resolution. |

---

## 2. Benchmark Industrial Service Test Scenarios

### Scenario A: Roll-off Dumpster Rate & Quantity Mismatch
- **Context**: Apex Construction LLC contracted roll-off dumpster haul.
- **Records**: Service Ticket `TKT-4401` logged 8.5 tons @ $80/ton ($680.00). Invoice `INV-9021` billed 11.25 tons @ $80/ton ($900.00). Certified scale ticket `SC-8812` confirms 8.5 net tons.
- **Expected Resolution**: `credit_memo` for $220.00 overcharge.
- **Evaluation Status**: **PASSED** in [`test_investigations.py`](file:///Users/deepshah/Desktop/Projects/Operations%20Agent/backend/tests/test_investigations.py).

### Scenario B: Unbilled Emergency Commercial Compactor Pull
- **Context**: GreenValley Municipal Complex weekend compactor pull.
- **Records**: Service Ticket `TKT-9912` completed by driver with amount $1,450.00. No customer invoice includes this ticket reference.
- **Expected Resolution**: `rebill_invoice` for $1,450.00 unbilled haul.
- **Evaluation Status**: **PASSED** in [`test_exception_detection.py`](file:///Users/deepshah/Desktop/Projects/Operations%20Agent/backend/tests/test_exception_detection.py).

### Scenario C: Duplicate Billing Incident
- **Context**: Delta Logistics Hub recycling haul billed across two separate invoices (`INV-8801` and `INV-8802`).
- **Expected Resolution**: `credit_memo` or invoice void for redundant charge ($780.00).
- **Evaluation Status**: **PASSED**.

---

## 3. Running Agent Evaluations

Execute the automated benchmark suite:
```bash
PYTHONPATH=. pytest -v backend/tests/test_investigations.py
```
