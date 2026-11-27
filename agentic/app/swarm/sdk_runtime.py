"""Google Antigravity SDK Runtime Engine for the Manufacturing Operations Swarm.

Replaces all LangChain / LangGraph / LangSmith orchestration with native google.antigravity
Agent, LocalAgentConfig, SubagentConfig, BudgetConfig, declarative safety policies,
lifecycle hooks, and Pydantic response schemas, with deterministic grounded fallback when
running offline or with mock LLM mode enabled.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import json
import logging
import os
import tempfile
import time
from collections import deque
from collections.abc import Callable
from pathlib import Path
from typing import Any

from agentic.app.prompts.investigation import INVESTIGATION_SYSTEM_PROMPT
from agentic.app.swarm.state import InvestigationOutputSchema
from dotenv import load_dotenv
from google.antigravity import (
    Agent,
    GeminiAPIEndpoint,
    GeminiModelOptions,
    LocalAgentConfig,
    ModelTarget,
    ModelType,
    ThinkingLevel,
    types,
)
from google.antigravity.hooks import hooks, policy
from google.antigravity.models import DEFAULT_MODEL

_ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(dotenv_path=_ROOT_DIR / ".env")

logger = logging.getLogger("antigravity_swarm")

# Circuit breaker for live remote API resilience
_CIRCUIT_OPEN_UNTIL: float | None = None

_DISABLED_BUILTIN_TOOLS = [
    types.BuiltinTools.RUN_COMMAND,
    types.BuiltinTools.CREATE_FILE,
    types.BuiltinTools.EDIT_FILE,
    types.BuiltinTools.VIEW_FILE,
    types.BuiltinTools.LIST_DIR,
    types.BuiltinTools.SEARCH_DIR,
    types.BuiltinTools.FIND_FILE,
    types.BuiltinTools.SEARCH_WEB,
    types.BuiltinTools.READ_URL_CONTENT,
    types.BuiltinTools.GENERATE_IMAGE,
    types.BuiltinTools.SCHEDULE,
]


def _get_api_key() -> str:
    for env_var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        val = os.environ.get(env_var, "").strip().strip('"').strip("'")
        if val and not val.startswith("your-") and not val.startswith("AQ.") and len(val) > 8:
            return val
    return ""


def is_antigravity_live_configured() -> bool:
    """Return True if Google Antigravity SDK can invoke hosted Gemini models."""
    if os.environ.get("USE_MOCK_LLM_IN_DEV", "").lower() in ("true", "1"):
        return False
    if os.environ.get("AGENTIC_FORCE_OFFLINE", "").lower() in ("true", "1"):
        return False
    if os.environ.get("PYTEST_CURRENT_TEST"):
        # Keep unit/integration tests deterministic and fast without external API latency
        return False
    if _CIRCUIT_OPEN_UNTIL is not None and time.time() < _CIRCUIT_OPEN_UNTIL:
        return False
    return bool(_get_api_key())


def get_sdk_status() -> dict[str, Any]:
    """Return Antigravity SDK configuration status for UI badges and settings."""
    has_key = bool(_get_api_key())
    live = is_antigravity_live_configured()
    return {
        "sdk": "Google Antigravity SDK",
        "sdk_version": "0.1.24",
        "provider": "Google Antigravity SDK",
        "model": DEFAULT_MODEL if live else "deterministic-grounded",
        "configured": has_key,
        "live_enabled": live,
        "badge": f"Antigravity SDK · {DEFAULT_MODEL}" if live else "Antigravity SDK · Grounded Engine",
    }


def _run_coro_sync(coro: Any, timeout_seconds: float = 45.0) -> Any:
    """Execute an async coroutine safely from either sync or active-loop contexts."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(asyncio.wait_for(coro, timeout=timeout_seconds))

    # Already inside a running loop (e.g. FastAPI async worker) -> run in worker thread
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(lambda: asyncio.run(asyncio.wait_for(coro, timeout=timeout_seconds)))
        return future.result(timeout=timeout_seconds + 2.0)


def _build_safe_policies(
    allowed_tool_names: list[str],
    allow_subagents: bool = False,
) -> list[policy.Policy]:
    """Least-privilege declarative policies: deny all by default, allow only vetted tools."""
    rules: list[policy.Policy] = [
        policy.deny_all(),
        policy.allow("finish"),
    ]
    if allow_subagents:
        rules.append(policy.allow("invoke_subagent"))
    for name in allowed_tool_names:
        rules.append(policy.allow(name))
    return rules


def _build_telemetry_hooks(trace_log: list[dict[str, Any]]) -> list[Any]:
    """Attach Antigravity lifecycle hooks to capture real tool call telemetry."""

    @hooks.post_tool_call
    async def _on_post_tool(data: types.ToolResult) -> None:
        tool_name = getattr(data, "tool_name", None) or getattr(data, "name", "tool")
        trace_log.append(
            {
                "event": "tool_executed",
                "tool": str(tool_name),
                "ok": not bool(getattr(data, "is_error", False)),
            }
        )

    @hooks.on_tool_error
    async def _on_tool_err(err: Exception) -> str | None:
        trace_log.append({"event": "tool_error", "error": str(err)})
        return f"Tool recovered gracefully: {err}. Use remaining verified data."

    return [_on_post_tool, _on_tool_err]


def _build_model_targets(api_key: str, thinking: ThinkingLevel = ThinkingLevel.LOW) -> list[ModelTarget]:
    endpoint = GeminiAPIEndpoint(
        api_key=api_key,
        options=GeminiModelOptions(thinking_level=thinking),
    )
    return [
        ModelTarget(
            name=DEFAULT_MODEL,
            types=[ModelType.TEXT],
            endpoint=endpoint,
        )
    ]


# ---------------------------------------------------------------------------
# 1. Conversational Agent Chat via Antigravity SDK
# ---------------------------------------------------------------------------

async def _chat_async(
    system_instructions: str,
    prompt: str,
    tools: list[Callable[..., Any]],
) -> tuple[str, list[str], dict[str, Any]]:
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not configured.")

    trace_log: list[dict[str, Any]] = []
    tool_names = [getattr(t, "__name__", str(t)) for t in tools]

    with tempfile.TemporaryDirectory(prefix="agy_chat_") as tmp_dir:
        config = LocalAgentConfig(
            models=_build_model_targets(api_key, ThinkingLevel.MINIMAL),
            api_key=api_key,
            system_instructions=system_instructions,
            tools=tools,
            hooks=_build_telemetry_hooks(trace_log),
            policies=_build_safe_policies(tool_names, allow_subagents=False),
            capabilities=types.CapabilitiesConfig(
                agent_behavior=types.AgentBehavior.MINIMAL,
                enable_subagents=False,
                disabled_tools=_DISABLED_BUILTIN_TOOLS,
            ),
            budget_config=types.BudgetConfig(
                max_model_calls=6,
                max_tool_calls=12,
                max_total_tokens=45_000,
            ),
            save_dir=tmp_dir,
            app_data_dir=tmp_dir,
            workspaces=[tmp_dir],
        )
        async with Agent(config) as ag:
            response = await ag.chat(prompt)
            text = (await response.text() or "").strip()
            usage = ag.conversation.total_usage
            tools_used = []
            for item in trace_log:
                tname = item.get("tool")
                if tname and tname not in ("finish", "tool") and tname not in tools_used:
                    tools_used.append(tname)
            usage_info = {
                "total_tokens": getattr(usage, "total_token_count", 0) if usage else 0,
                "model": DEFAULT_MODEL,
            }
            return text, tools_used, usage_info


def run_antigravity_chat(
    system_instructions: str,
    history: list[dict[str, str]],
    user_message: str,
    tools: list[Callable[..., Any]],
    timeout_seconds: float = 30.0,
) -> tuple[str | None, list[str], dict[str, Any]]:
    """Run multi-turn operations chat using Google Antigravity Agent."""
    global _CIRCUIT_OPEN_UNTIL
    if not is_antigravity_live_configured():
        return None, [], {}

    convo_lines = []
    for turn in history[-10:]:
        role = "User" if turn.get("role") == "user" else "Assistant"
        content = (turn.get("content") or "").strip()
        if content:
            convo_lines.append(f"{role}: {content}")
    convo_lines.append(f"User: {user_message}")
    full_prompt = (
        "Conversation context:\n" + "\n".join(convo_lines)
        if len(convo_lines) > 1
        else user_message
    )

    try:
        text, tools_used, usage = _run_coro_sync(
            _chat_async(system_instructions, full_prompt, tools),
            timeout_seconds=timeout_seconds,
        )
        return text or None, tools_used, usage
    except Exception as exc:
        logger.warning(f"Antigravity SDK live chat fallback triggered: {exc}")
        if any(k in str(exc).upper() for k in ("401", "INVALID_API_KEY", "UNAUTHENTICATED")):
            _CIRCUIT_OPEN_UNTIL = time.time() + 120.0
        return None, [], {"error": str(exc)}


# ---------------------------------------------------------------------------
# 2. Grounded Exception Investigation via Antigravity SDK
# ---------------------------------------------------------------------------

async def _investigate_async(
    prompt_context: dict[str, Any],
) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    api_key = _get_api_key()
    if not api_key:
        return None, {}

    subagents = [
        types.SubagentConfig(
            name="bom_guard",
            description="Audits raw material weights, receiving slips, and BOM variances.",
            system_instructions="Verify material quantities and receiving dock weights strictly from input data.",
            capabilities=types.SubagentCapabilities(
                agent_behavior=types.AgentBehavior.MINIMAL,
                disabled_tools=_DISABLED_BUILTIN_TOOLS,
            ),
        ),
        types.SubagentConfig(
            name="cost_sentry",
            description="Audits 3-way PO, work order, and invoice pricing variances.",
            system_instructions="Verify unit rates, duplicate invoices, and unbilled batches strictly from input data.",
            capabilities=types.SubagentCapabilities(
                agent_behavior=types.AgentBehavior.MINIMAL,
                disabled_tools=_DISABLED_BUILTIN_TOOLS,
            ),
        ),
        types.SubagentConfig(
            name="line_pulse",
            description="Audits shop-floor machine cell swaps and production schedule drift.",
            system_instructions="Verify machine cell IDs and production schedule shifts strictly from input data.",
            capabilities=types.SubagentCapabilities(
                agent_behavior=types.AgentBehavior.MINIMAL,
                disabled_tools=_DISABLED_BUILTIN_TOOLS,
            ),
        ),
    ]

    with tempfile.TemporaryDirectory(prefix="agy_inv_") as tmp_dir:
        config = LocalAgentConfig(
            models=_build_model_targets(api_key, ThinkingLevel.LOW),
            api_key=api_key,
            system_instructions=INVESTIGATION_SYSTEM_PROMPT,
            response_schema=InvestigationOutputSchema,
            subagents=subagents,
            policies=_build_safe_policies([], allow_subagents=True),
            capabilities=types.CapabilitiesConfig(
                agent_behavior=types.AgentBehavior.AUTONOMOUS,
                enable_subagents=True,
                max_subagent_depth=1,
                allowed_subagents=["bom_guard", "cost_sentry", "line_pulse"],
                disabled_tools=_DISABLED_BUILTIN_TOOLS,
            ),
            budget_config=types.BudgetConfig(
                max_model_calls=6,
                max_tool_calls=8,
                max_total_tokens=40_000,
            ),
            save_dir=tmp_dir,
            app_data_dir=tmp_dir,
            workspaces=[tmp_dir],
        )
        async with Agent(config) as ag:
            prompt = (
                "Analyze this manufacturing operational discrepancy using the verified evidence and math below. "
                "Cite exact reference numbers.\n\n"
                f"{json.dumps(prompt_context, indent=2, default=str)}"
            )
            response = await ag.chat(prompt)
            structured = await response.structured_output()
            usage = ag.conversation.total_usage
            meta = {
                "sdk": "google-antigravity",
                "model": DEFAULT_MODEL,
                "total_tokens": getattr(usage, "total_token_count", 0) if usage else 0,
            }
            return structured, meta


class AntigravityInvestigationAnalyzer:
    """Investigates manufacturing exceptions via Google Antigravity SDK with deterministic fallback."""

    @classmethod
    def analyze(
        cls,
        exception_data: dict[str, Any],
        records: list[dict[str, Any]],
        math_variance: dict[str, Any],
        evidence_items: list[dict[str, Any]],
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        if is_antigravity_live_configured():
            try:
                ctx = {
                    "exception": exception_data,
                    "operational_records": records,
                    "reconciliation_math": math_variance,
                    "evidence_items": evidence_items,
                }
                structured, meta = _run_coro_sync(_investigate_async(ctx), timeout_seconds=35.0)
                if structured and isinstance(structured, dict) and structured.get("proposed_resolution"):
                    return structured, meta
            except Exception as exc:
                logger.warning(f"Antigravity investigation live fallback triggered: {exc}")

        return (
            cls.deterministic_reasoning(exception_data, records, math_variance),
            {"sdk": "google-antigravity", "mode": "deterministic-grounded", "total_tokens": 0},
        )

    @staticmethod
    def deterministic_reasoning(
        exception_data: dict[str, Any],
        records: list[dict[str, Any]],
        math_variance: dict[str, Any],
    ) -> dict[str, Any]:
        exc_type = exception_data.get("exception_type", "")
        amt_diff = float(math_variance.get("amount_difference") or 0.0)
        qty_diff = float(math_variance.get("quantity_difference") or 0.0)

        invoices = [r for r in records if r.get("record_type") == "invoice"]
        tickets = [r for r in records if r.get("record_type") == "service_ticket"]
        loads = [r for r in records if r.get("record_type") == "load_record"]

        account = (
            (invoices[0].get("customer_reference") if invoices else None)
            or (tickets[0].get("customer_reference") if tickets else None)
            or "Manufacturing Account"
        )

        if exc_type == "rate_mismatch":
            inv_ref = invoices[0].get("external_reference") if invoices else "Invoice"
            tkt_ref = tickets[0].get("external_reference") if tickets else "PO / Work Order"
            inv_amt = float(math_variance.get("billed_amount") or 0.0)
            exp_amt = float(math_variance.get("expected_amount") or 0.0)

            if amt_diff > 0:
                action_type = "credit_memo"
                rec_action = f"Request ${amt_diff:,.2f} Credit Memo / Cost Recovery on {inv_ref}"
                explanation = (
                    f"3-way verification of {inv_ref} (${inv_amt:,.2f}) against {tkt_ref} (${exp_amt:,.2f}) "
                    f"shows an overcharge of ${amt_diff:,.2f} for {account}. Approving this credit memo "
                    f"captures ${amt_diff:,.2f} in direct procurement/billing savings."
                )
            else:
                action_type = "rebill_invoice"
                rec_action = f"Reconcile ${abs(amt_diff):,.2f} Undercharge Variance on {inv_ref}"
                explanation = (
                    f"Order {tkt_ref} recorded ${exp_amt:,.2f}, while {inv_ref} billed ${inv_amt:,.2f}. "
                    f"Recommend issuing a ${abs(amt_diff):,.2f} adjustment for {account}."
                )

            analysis = (
                f"Root Cause: Unit-price / rate variance between {inv_ref} (billed: ${inv_amt:,.2f}) and "
                f"contracted order {tkt_ref} (expected: ${exp_amt:,.2f}). Variance is ${amt_diff:+,.2f} "
                f"({math_variance.get('percentage_variance', 0):+.1f}%)."
            )
            confidence = 0.96

        elif exc_type == "quantity_mismatch":
            tkt_ref = tickets[0].get("external_reference") if tickets else "Work Order"
            ld_ref = loads[0].get("external_reference") if loads else "Receiving Slip"
            unit = (tickets[0].get("unit") if tickets else None) or (loads[0].get("unit") if loads else None) or "units"
            billed_q = float(math_variance.get("billed_quantity") or 0.0)
            actual_q = float(math_variance.get("actual_quantity") or 0.0)
            rate = float(math_variance.get("unit_rate") or 50.0)
            fin_impact = round(qty_diff * rate, 2)

            action_type = "credit_memo" if qty_diff > 0 else "rebill_invoice"
            rec_action = f"Adjust Material Quantity to Certified Receiving Slip {ld_ref} (${abs(fin_impact):,.2f})"
            analysis = (
                f"Root Cause: Receiving dock / BOM quantity variance. {tkt_ref} logged {billed_q:,.2f} {unit}, "
                f"whereas certified receiving receipt {ld_ref} verified {actual_q:,.2f} {unit} "
                f"(diff: {qty_diff:+,.2f} {unit})."
            )
            explanation = (
                f"Account {account} was billed/logged for {billed_q:,.2f} {unit} instead of verified dock weight "
                f"{actual_q:,.2f} {unit} on {ld_ref}. At ${rate:,.2f}/{unit}, financial variance is ${abs(fin_impact):,.2f}."
            )
            confidence = 0.95

        elif exc_type == "unbilled_job":
            tkt_ref = tickets[0].get("external_reference") if tickets else "Work Order"
            tkt_amt = float((tickets[0].get("amount") if tickets else None) or exception_data.get("discrepancy_amount") or 0.0)
            action_type = "rebill_invoice"
            rec_action = f"Invoice Completed Production Work Order {tkt_ref} (+${tkt_amt:,.2f})"
            analysis = (
                f"Root Cause: Unbilled finished goods batch. Work order {tkt_ref} for {account} is marked "
                f"completed and shipped, but was omitted from the invoicing cycle."
            )
            explanation = (
                f"Production order {tkt_ref} representing ${tkt_amt:,.2f} is complete and verified. "
                f"Stage invoice line item for {account} to recover ${tkt_amt:,.2f}."
            )
            confidence = 0.98

        elif exc_type == "duplicate_billing":
            inv_refs = [i.get("external_reference") for i in invoices if i.get("external_reference")]
            dupe_amt = sum(float(i.get("amount") or 0.0) for i in invoices[1:]) if len(invoices) > 1 else float(exception_data.get("discrepancy_amount") or 0.0)
            action_type = "credit_memo"
            rec_action = f"Void Duplicate Invoice Batch ({', '.join(inv_refs) or 'Duplicate'})"
            analysis = (
                f"Root Cause: Duplicate billing detected across {', '.join(inv_refs) or 'multiple batches'}. "
                f"Same production/PO reference was posted twice."
            )
            explanation = (
                f"Voiding the duplicate invoice for {account} immediately prevents ${dupe_amt:,.2f} in double charges."
            )
            confidence = 0.99

        else:
            action_type = "dispatch_adjustment"
            rec_action = "Sync ERP Production Schedule with Shop-Floor Execution Log"
            analysis = (
                "Root Cause: Shop-floor machine cell reassignment or shift drift between ERP production "
                "schedule and completed work order log."
            )
            explanation = (
                "Align ERP routing with actual machine cell log so OEE and preventive maintenance hours stay accurate."
            )
            confidence = 0.92

        proposed_amount = (
            abs(amt_diff)
            if amt_diff
            else float(exception_data.get("discrepancy_amount") or abs(qty_diff * float(math_variance.get("unit_rate") or 50.0)))
        )

        return {
            "root_cause_analysis": analysis,
            "confidence_score": confidence,
            "proposed_resolution": {
                "action_type": action_type,
                "recommended_action": rec_action,
                "proposed_amount": round(proposed_amount, 2),
                "customer_reference": account,
                "affected_reference": (
                    invoices[0].get("external_reference")
                    if invoices
                    else (tickets[0].get("external_reference") if tickets else "Record")
                ),
                "explanation": explanation,
            },
        }


# ---------------------------------------------------------------------------
# 3. Dynamic Drag-and-Drop Swarm Workflow Executor via Antigravity SDK
# ---------------------------------------------------------------------------

def _parse_inline_csv_rows(csv_text: str, default_record_type: str = "service_ticket") -> list[dict[str, Any]]:
    """Parse lightweight CSV rows pasted into a canvas connector_input block."""
    import csv
    import io

    if not csv_text or not csv_text.strip():
        return []
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    parsed: list[dict[str, Any]] = []
    for idx, row in enumerate(reader, start=1):
        norm = {str(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        ext_ref = (
            norm.get("external_reference")
            or norm.get("ticket_number")
            or norm.get("po_number")
            or norm.get("invoice_number")
            or norm.get("scale_ticket_id")
            or norm.get("dispatch_id")
            or f"ROW-{idx}"
        )
        cust = (
            norm.get("customer_reference")
            or norm.get("customer_name")
            or norm.get("supplier_name")
            or norm.get("vendor")
            or "Custom Sheet Supplier"
        )
        rtype = norm.get("record_type") or default_record_type
        if rtype == "all":
            if "invoice" in norm.get("invoice_number", "").lower() or ext_ref.upper().startswith("INV"):
                rtype = "invoice"
            elif ext_ref.upper().startswith("RCV") or "net_tons" in norm:
                rtype = "load_record"
            elif ext_ref.upper().startswith("SCH"):
                rtype = "dispatch_record"
            else:
                rtype = "service_ticket"

        def _num(keys: tuple[str, ...], row_map: dict[str, str] = norm) -> float | None:
            for k in keys:
                val = row_map.get(k)
                if val:
                    try:
                        return float(val.replace("$", "").replace(",", ""))
                    except ValueError:
                        continue
            return None

        qty = _num(("quantity", "qty", "net_tons", "weight", "units"))
        rate = _num(("rate", "unit_price", "unit_rate"))
        amt = _num(("amount", "total", "total_charge", "invoice_amount"))
        if amt is None and qty is not None and rate is not None:
            amt = round(qty * rate, 2)

        parsed.append(
            {
                "id": f"inline-{idx}-{ext_ref}",
                "record_type": rtype,
                "external_reference": ext_ref,
                "customer_reference": cust,
                "service_date": norm.get("service_date") or norm.get("invoice_date") or norm.get("weigh_date"),
                "amount": amt,
                "quantity": qty,
                "unit": norm.get("unit") or "tons",
                "rate": rate,
                "status": norm.get("status") or "completed",
                "normalized_data": {**norm, "source": "workflow_inline_csv"},
            }
        )
    return parsed


def _detect_inline_exceptions(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Run lightweight cross-record math on inline CSV rows so custom sheet inputs generate real findings."""
    excs: list[dict[str, Any]] = []
    by_cust: dict[str, list[dict[str, Any]]] = {}
    for r in records:
        by_cust.setdefault(str(r.get("customer_reference") or "").lower(), []).append(r)

    for group in by_cust.values():
        tkts = [r for r in group if r.get("record_type") == "service_ticket"]
        invs = [r for r in group if r.get("record_type") == "invoice"]
        loads = [r for r in group if r.get("record_type") == "load_record"]
        if tkts and invs:
            t_amt = float(tkts[0].get("amount") or 0.0)
            i_amt = float(invs[0].get("amount") or 0.0)
            diff = round(abs(i_amt - t_amt), 2)
            if diff > 1.0:
                excs.append(
                    {
                        "id": f"inline-rate-{tkts[0]['external_reference']}",
                        "exception_type": "rate_mismatch",
                        "title": f"Sheet Invoice vs PO Variance ({invs[0]['external_reference']} / {tkts[0]['external_reference']})",
                        "severity": "high" if diff >= 500 else "medium",
                        "status": "open",
                        "discrepancy_amount": diff,
                        "related_record_ids": [tkts[0]["id"], invs[0]["id"]],
                    }
                )
        if tkts and loads:
            t_qty = float(tkts[0].get("quantity") or 0.0)
            l_qty = float(loads[0].get("quantity") or 0.0)
            q_diff = round(abs(t_qty - l_qty), 2)
            rate = float(tkts[0].get("rate") or 50.0)
            if q_diff > 0.05:
                impact = round(q_diff * rate, 2)
                excs.append(
                    {
                        "id": f"inline-qty-{tkts[0]['external_reference']}",
                        "exception_type": "quantity_mismatch",
                        "title": f"Sheet Receiving Shortage ({tkts[0]['external_reference']} vs {loads[0]['external_reference']})",
                        "severity": "high" if impact >= 500 else "medium",
                        "status": "open",
                        "discrepancy_amount": impact,
                        "related_record_ids": [tkts[0]["id"], loads[0]["id"]],
                    }
                )
    return excs


def _topological_order(nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
    node_map = {str(n["id"]): n for n in nodes if "id" in n}
    in_degree = {nid: 0 for nid in node_map}
    adj: dict[str, list[str]] = {nid: [] for nid in node_map}

    for edge in edges:
        src = str(edge.get("source", ""))
        tgt = str(edge.get("target", ""))
        if src in node_map and tgt in node_map and src != tgt:
            adj[src].append(tgt)
            in_degree[tgt] += 1

    queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
    ordered_ids: list[str] = []
    while queue:
        curr = queue.popleft()
        ordered_ids.append(curr)
        for nxt in adj[curr]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                queue.append(nxt)

    for n in nodes:
        nid = str(n.get("id", ""))
        if nid and nid not in ordered_ids:
            ordered_ids.append(nid)

    return [node_map[nid] for nid in ordered_ids]


def _evaluate_edge(
    edge: dict[str, Any],
    src_packet: dict[str, Any],
    threshold_usd: float = 500.0,
) -> tuple[bool, dict[str, Any], str]:
    """Evaluate routing condition and filter flowing data packet along an edge."""
    if not src_packet.get("active", True):
        return False, {}, "Skipped (upstream block did not run)"

    cond = str(edge.get("condition") or "always")
    records = list(src_packet.get("records") or [])
    exceptions = list(src_packet.get("exceptions") or [])
    items = list(src_packet.get("processed_items") or [])
    notes = list(src_packet.get("findings") or [])
    src_savings = float(src_packet.get("cost_savings_usd") or 0.0)

    if cond == "if_discrepancy_found":
        has_leak = bool(exceptions) or bool(items) or src_savings > 0.0
        if not has_leak:
            return False, {}, "Stopped: no discrepancies found upstream"
        return True, {
            "records": records,
            "exceptions": exceptions,
            "processed_items": items,
            "findings": notes,
            "cost_savings_usd": src_savings,
        }, f"Routed {len(items) or len(exceptions) or 1} discrepancy item(s)"

    if cond == "if_variance_gt_500":
        hi_items = [it for it in items if float(it.get("amount_usd") or 0.0) >= threshold_usd]
        hi_excs = [e for e in exceptions if float(e.get("discrepancy_amount") or 0.0) >= threshold_usd]
        if not hi_items and not hi_excs and src_savings < threshold_usd:
            return False, {}, f"Stopped: all items < ${threshold_usd:,.0f} gate"
        return True, {
            "records": records,
            "exceptions": hi_excs,
            "processed_items": hi_items,
            "findings": [f"[>=${threshold_usd:,.0f}] {n}" for n in notes],
            "cost_savings_usd": sum(float(x.get("amount_usd") or 0.0) for x in hi_items) or src_savings,
        }, f"Routed {len(hi_items) or len(hi_excs)} high-value item(s) >= ${threshold_usd:,.0f}"

    if cond == "auto_settle_below_500":
        lo_items = [it for it in items if float(it.get("amount_usd") or 0.0) < threshold_usd]
        lo_excs = [e for e in exceptions if float(e.get("discrepancy_amount") or 0.0) < threshold_usd]
        if not lo_items and not lo_excs and src_savings >= threshold_usd:
            return False, {}, f"Stopped: no low-risk items < ${threshold_usd:,.0f}"
        return True, {
            "records": records,
            "exceptions": lo_excs,
            "processed_items": lo_items,
            "findings": [f"[Auto <${threshold_usd:,.0f}] {n}" for n in notes],
            "cost_savings_usd": sum(float(x.get("amount_usd") or 0.0) for x in lo_items),
        }, f"Routed {len(lo_items) or len(lo_excs)} low-risk item(s) < ${threshold_usd:,.0f}"

    item_count = len(items) or len(records)
    return True, {
        "records": records,
        "exceptions": exceptions,
        "processed_items": items,
        "findings": notes,
        "cost_savings_usd": src_savings,
    }, f"Passed {item_count} item(s) forward"


def execute_swarm_workflow_dag(
    workflow_name: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    org_records: list[dict[str, Any]],
    org_exceptions: list[dict[str, Any]],
    connectors: list[dict[str, Any]],
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Compile a drag-and-drop swarm graph into an Antigravity SDK orchestrator + subagents,
    route real data packets across connected edges, and produce grounded cost/time savings & exports.
    """
    from agentic.app.agents.dispatcher import OperationsAgentDispatcher
    from agentic.app.agents.registry import canonical_agent_id, get_agent_definition

    ordered_nodes = _topological_order(nodes, edges)
    incoming_edges_map: dict[str, list[dict[str, Any]]] = {str(n["id"]): [] for n in ordered_nodes if "id" in n}
    for edge in edges:
        tgt = str(edge.get("target", ""))
        if tgt in incoming_edges_map:
            incoming_edges_map[tgt].append(edge)

    has_any_inputs = any(str(n.get("kind") or "") in ("connector_input", "source") for n in ordered_nodes)

    step_results: list[dict[str, Any]] = []
    node_packets: dict[str, dict[str, Any]] = {}
    edge_traces: list[dict[str, Any]] = []
    exported_artifacts: list[dict[str, Any]] = []

    subagent_configs: list[types.SubagentConfig] = []
    allowed_subagent_names: list[str] = []

    open_excs = [e for e in org_exceptions if e.get("status") not in ("resolved", "dismissed")]

    # Build Antigravity SubagentConfigs for every agent node in the user's canvas
    for node in ordered_nodes:
        kind = node.get("kind") or node.get("type") or ""
        if kind == "agent":
            agent_id = canonical_agent_id(str(node.get("agent_id") or node.get("ref_id") or "cost_sentry"))
            defn = get_agent_definition(agent_id)
            if defn and defn.id not in allowed_subagent_names:
                allowed_subagent_names.append(defn.id)
                subagent_configs.append(
                    types.SubagentConfig(
                        name=defn.id,
                        description=defn.tagline,
                        system_instructions=f"You are {defn.name} ({defn.code_name}). {defn.simple_summary}",
                        capabilities=types.SubagentCapabilities(
                            agent_behavior=types.AgentBehavior.MINIMAL,
                            disabled_tools=_DISABLED_BUILTIN_TOOLS,
                        ),
                    )
                )

    total_cost_savings = 0.0
    total_time_saved_mins = 0.0
    threshold_usd = 500.0
    all_findings_notes: list[str] = []

    for idx, node in enumerate(ordered_nodes, start=1):
        nid = str(node.get("id", f"node_{idx}"))
        kind = str(node.get("kind") or node.get("type") or "agent")
        label = str(node.get("label") or nid)
        config_data = node.get("config") or {}
        in_edges = incoming_edges_map.get(nid, [])

        # Merge data flowing from connected upstream nodes
        merged_records: list[dict[str, Any]] = []
        merged_exceptions: list[dict[str, Any]] = []
        merged_items: list[dict[str, Any]] = []
        merged_notes: list[str] = []
        seen_rec_ids: set[str] = set()
        seen_exc_ids: set[str] = set()
        any_edge_triggered = False

        if in_edges:
            for ed in in_edges:
                src_id = str(ed.get("source", ""))
                src_pkt = node_packets.get(src_id, {"active": False})
                passed, routed_pkt, trace_msg = _evaluate_edge(ed, src_pkt, threshold_usd=threshold_usd)
                edge_traces.append(
                    {
                        "edge_id": str(ed.get("id") or f"{src_id}->{nid}"),
                        "source": src_id,
                        "target": nid,
                        "condition": str(ed.get("condition") or "always"),
                        "triggered": passed,
                        "items_passed": len(routed_pkt.get("processed_items") or routed_pkt.get("records") or []) if passed else 0,
                        "summary": trace_msg,
                    }
                )
                if passed:
                    any_edge_triggered = True
                    for r in routed_pkt.get("records") or []:
                        rid = str(r.get("id") or r.get("external_reference"))
                        if rid not in seen_rec_ids:
                            seen_rec_ids.add(rid)
                            merged_records.append(r)
                    for e in routed_pkt.get("exceptions") or []:
                        eid = str(e.get("id"))
                        if eid not in seen_exc_ids:
                            seen_exc_ids.add(eid)
                            merged_exceptions.append(e)
                    merged_items.extend(routed_pkt.get("processed_items") or [])
                    merged_notes.extend(routed_pkt.get("findings") or [])

            if not any_edge_triggered:
                node_packets[nid] = {"active": False}
                step_results.append(
                    {
                        "step": idx,
                        "node_id": nid,
                        "kind": kind,
                        "label": label,
                        "status": "skipped",
                        "cost_savings_usd": 0.0,
                        "time_saved_minutes": 0.0,
                        "summary": "Skipped — incoming wire condition was not triggered or upstream source was inactive.",
                        "output": {"records_in": 0, "skipped_reason": "branch_not_triggered"},
                    }
                )
                continue
        else:
            # Root node with no incoming edges
            if kind in ("connector_output", "output", "approval_gate", "gate") and has_any_inputs:
                node_packets[nid] = {"active": False}
                step_results.append(
                    {
                        "step": idx,
                        "node_id": nid,
                        "kind": kind,
                        "label": label,
                        "status": "skipped",
                        "cost_savings_usd": 0.0,
                        "time_saved_minutes": 0.0,
                        "summary": "Not connected — wire an upstream Input or Agent into this block so data can flow here.",
                        "output": {"records_in": 0, "skipped_reason": "unconnected"},
                    }
                )
                continue
            merged_records = list(org_records)
            merged_exceptions = list(open_excs)

        # Execute by node kind
        if kind in ("connector_input", "source"):
            conn_id = str(config_data.get("connector_id") or "")
            conn_type = str(config_data.get("connector_type") or node.get("ref_id") or "google_sheets")
            matched_conn = next(
                (c for c in connectors if (conn_id and c.get("id") == conn_id) or c.get("connector_type") == conn_type),
                None,
            )
            conn_label = matched_conn.get("name") if matched_conn else label
            rtype_filter = str(config_data.get("record_type") or "all")
            inline_csv = str(config_data.get("sample_csv") or "")

            if inline_csv.strip():
                source_records = _parse_inline_csv_rows(inline_csv, default_record_type=rtype_filter)
                source_exceptions = _detect_inline_exceptions(source_records)
                source_mode = "custom_node_csv"
            else:
                if rtype_filter != "all":
                    source_records = [r for r in org_records if r.get("record_type") == rtype_filter]
                else:
                    source_records = list(org_records)
                allowed_ids = {str(r.get("id")) for r in source_records}
                source_exceptions = [
                    e
                    for e in open_excs
                    if rtype_filter == "all" or any(str(rid) in allowed_ids for rid in (e.get("related_record_ids") or []))
                ]
                source_mode = "connected_plant_records"

            rec_count = len(source_records)
            exc_count = len(source_exceptions)
            time_saved = 15.0
            total_time_saved_mins += time_saved
            summary_txt = (
                f"Loaded {rec_count} record(s) and {exc_count} candidate discrepancy(ies) from {conn_label}"
                + (" (custom flow CSV)." if source_mode == "custom_node_csv" else f" ({conn_type}).")
            )
            node_packets[nid] = {
                "active": True,
                "records": source_records,
                "exceptions": source_exceptions,
                "processed_items": [],
                "findings": [summary_txt],
                "cost_savings_usd": 0.0,
            }
            all_findings_notes.append(f"Input {conn_label}: {rec_count} records")
            step_results.append(
                {
                    "step": idx,
                    "node_id": nid,
                    "kind": kind,
                    "label": label,
                    "status": "completed",
                    "cost_savings_usd": 0.0,
                    "time_saved_minutes": time_saved,
                    "summary": summary_txt,
                    "output": {
                        "records_loaded": rec_count,
                        "exceptions_in_feed": exc_count,
                        "connector": conn_label,
                        "source_mode": source_mode,
                        "sample_refs": [r.get("external_reference") for r in source_records[:6]],
                    },
                }
            )

        elif kind == "agent":
            agent_id = canonical_agent_id(str(node.get("agent_id") or node.get("ref_id") or "cost_sentry"))
            defn = get_agent_definition(agent_id)
            rec_map = {str(r.get("id")): r for r in merged_records}
            agent_items: list[dict[str, Any]] = []
            agent_notes: list[str] = list(merged_notes)
            step_cost = 0.0
            step_time = 0.0
            last_res: dict[str, Any] = {}

            if agent_id == "plant_beacon":
                params = {
                    "records": merged_records,
                    "exceptions": merged_exceptions,
                    "timeframe": config_data.get("timeframe") or "Last 30 Days",
                }
                last_res = OperationsAgentDispatcher.execute_agent(agent_id, params)
                step_cost = float(last_res.get("cost_savings_usd") or 0.0)
                step_time = float(last_res.get("time_saved_minutes") or (defn.time_saved_per_task_mins if defn else 90.0))
                total_cost_savings = max(total_cost_savings, step_cost)
                step_summary = last_res.get("executive_summary") or "Compiled plant savings summary."
                agent_notes.append(f"{defn.name if defn else label}: {step_summary}")
                agent_items.extend(merged_items)
            else:
                matching_excs = [
                    e
                    for e in merged_exceptions
                    if (defn and e.get("exception_type") in defn.exception_types_handled)
                ]
                if not matching_excs and agent_id == "quality_shield" and merged_items:
                    # QualityShield can review discrepancies handed off from BOMGuard / CostSentry!
                    matching_excs = merged_exceptions[:2]

                if matching_excs:
                    for matching_exc in matching_excs[:3]:
                        exc_type = matching_exc.get("exception_type", "rate_mismatch")
                        rel_ids = [str(rid) for rid in (matching_exc.get("related_record_ids") or [])]
                        rel_recs = [rec_map[rid] for rid in rel_ids if rid in rec_map] or [
                            r for r in org_records if str(r.get("id")) in rel_ids
                        ]
                        params: dict[str, Any] = {}
                        if agent_id == "bom_guard":
                            tkts = [r for r in rel_recs if r.get("record_type") == "service_ticket"]
                            lds = [r for r in rel_recs if r.get("record_type") == "load_record"]
                            if tkts:
                                params["ticket_record"] = tkts[0]
                            if lds:
                                params["scale_record"] = lds[0]
                        elif agent_id == "line_pulse":
                            dsps = [r for r in rel_recs if r.get("record_type") == "dispatch_record"]
                            tkts = [r for r in rel_recs if r.get("record_type") == "service_ticket"]
                            if dsps:
                                params["dispatch_record"] = dsps[0]
                            if tkts:
                                params["ticket_record"] = tkts[0]
                        elif agent_id == "cost_sentry":
                            params["invoice_records"] = [r for r in rel_recs if r.get("record_type") == "invoice"]
                            params["ticket_records"] = [r for r in rel_recs if r.get("record_type") == "service_ticket"]
                            params["exception_type"] = exc_type
                        elif agent_id == "quality_shield":
                            params["related_records"] = rel_recs
                            params["dispute_claim"] = matching_exc.get("description") or matching_exc.get("title") or ""
                            params["disputed_amount"] = float(matching_exc.get("discrepancy_amount") or 140.0)

                        res = OperationsAgentDispatcher.execute_agent(agent_id, params)
                        last_res = res
                        amt = float(res.get("cost_savings_usd") or matching_exc.get("discrepancy_amount") or 0.0)
                        step_cost += amt
                        step_time += float(res.get("time_saved_minutes") or (defn.time_saved_per_task_mins if defn else 40.0))
                        prop = res.get("proposed_resolution") or {}
                        rec_action = prop.get("recommended_action") or matching_exc.get("title") or "Verified discrepancy"
                        agent_notes.append(f"{defn.name if defn else label}: {rec_action} (${amt:,.2f})")
                        agent_items.append(
                            {
                                "exception_id": matching_exc.get("id"),
                                "agent": defn.name if defn else label,
                                "title": matching_exc.get("title") or rec_action,
                                "recommended_action": rec_action,
                                "amount_usd": round(amt, 2),
                                "status": "requires_approval" if amt >= threshold_usd else "auto_ready",
                            }
                        )
                    total_cost_savings += step_cost
                    step_summary = (
                        f"Processed {len(matching_excs)} connected item(s) across {len(merged_records)} record(s): "
                        f"{agent_items[0]['recommended_action']}"
                        + (f" (+{len(agent_items) - 1} more)" if len(agent_items) > 1 else "")
                    )
                else:
                    # Deterministic scenario fallback when tenant DB / inline feed has 0 matching open items
                    last_res = OperationsAgentDispatcher.execute_agent(agent_id, {})
                    step_cost = float(last_res.get("cost_savings_usd") or 0.0)
                    step_time = float(last_res.get("time_saved_minutes") or (defn.time_saved_per_task_mins if defn else 40.0))
                    total_cost_savings += step_cost
                    prop = last_res.get("proposed_resolution") or {}
                    rec_action = prop.get("recommended_action") or f"{last_res.get('agent_name')} verified incoming batch."
                    step_summary = f"Audited {len(merged_records)} incoming record(s): {rec_action}"
                    agent_notes.append(f"{defn.name if defn else label}: {rec_action}")
                    agent_items.append(
                        {
                            "agent": defn.name if defn else label,
                            "title": rec_action,
                            "recommended_action": rec_action,
                            "amount_usd": round(step_cost, 2),
                            "status": "requires_approval" if step_cost >= threshold_usd else "auto_ready",
                        }
                    )

            total_time_saved_mins += step_time
            all_findings_notes.extend([n for n in agent_notes if n not in all_findings_notes])

            # Forward enriched packet downstream (preserving upstream items + new items)
            combined_items = list(merged_items) + [it for it in agent_items if it not in merged_items]
            node_packets[nid] = {
                "active": True,
                "records": merged_records,
                "exceptions": merged_exceptions,
                "processed_items": combined_items,
                "findings": agent_notes,
                "cost_savings_usd": step_cost,
            }
            step_results.append(
                {
                    "step": idx,
                    "node_id": nid,
                    "kind": kind,
                    "agent_id": agent_id,
                    "label": defn.name if defn else label,
                    "status": "completed",
                    "cost_savings_usd": round(step_cost, 2),
                    "time_saved_minutes": round(step_time, 1),
                    "summary": step_summary,
                    "output": {
                        "records_in": len(merged_records),
                        "items_processed": agent_items,
                        "details": last_res,
                    },
                }
            )

        elif kind in ("approval_gate", "gate"):
            threshold_usd = float(config_data.get("threshold_usd") or 500.0)
            candidate_items = list(merged_items)
            if not candidate_items and merged_exceptions:
                candidate_items = [
                    {
                        "exception_id": e.get("id"),
                        "title": e.get("title"),
                        "amount_usd": float(e.get("discrepancy_amount") or 0.0),
                    }
                    for e in merged_exceptions
                ]
            high_value = [it for it in candidate_items if float(it.get("amount_usd") or 0.0) >= threshold_usd]
            auto_ready = [it for it in candidate_items if float(it.get("amount_usd") or 0.0) < threshold_usd]
            gate_status = "awaiting_approval" if high_value else "completed"
            summary_txt = (
                f"Gate (${threshold_usd:,.0f} threshold) checked {len(candidate_items)} upstream finding(s): "
                f"{len(high_value)} held for 1-click manager approval; {len(auto_ready)} low-risk cleared."
            )
            node_packets[nid] = {
                "active": True,
                "records": merged_records,
                "exceptions": merged_exceptions,
                "processed_items": candidate_items,
                "findings": merged_notes + [summary_txt],
                "cost_savings_usd": sum(float(it.get("amount_usd") or 0.0) for it in candidate_items),
            }
            all_findings_notes.append(summary_txt)
            total_time_saved_mins += 10.0
            step_results.append(
                {
                    "step": idx,
                    "node_id": nid,
                    "kind": kind,
                    "label": label,
                    "status": gate_status,
                    "cost_savings_usd": 0.0,
                    "time_saved_minutes": 10.0,
                    "summary": summary_txt,
                    "output": {
                        "threshold_usd": threshold_usd,
                        "manager_signoff_required": len(high_value),
                        "auto_settle_eligible": len(auto_ready),
                        "held_items": high_value,
                    },
                }
            )

        elif kind in ("connector_output", "output"):
            conn_id = str(config_data.get("connector_id") or "")
            out_type = str(config_data.get("connector_type") or node.get("ref_id") or "google_docs")
            matched_conn = next(
                (c for c in connectors if (conn_id and c.get("id") == conn_id) or c.get("connector_type") == out_type),
                None,
            )
            conn_label = matched_conn.get("name") if matched_conn else label
            branch_notes = list(dict.fromkeys(merged_notes)) or list(all_findings_notes)
            branch_savings = sum(float(it.get("amount_usd") or 0.0) for it in merged_items) or total_cost_savings
            artifact_content = _build_connector_artifact(
                out_type=out_type,
                workflow_name=workflow_name,
                total_cost_savings=branch_savings,
                total_time_saved_mins=total_time_saved_mins,
                findings_notes=branch_notes,
            )
            artifact_title = (
                f"{workflow_name} — {conn_label}"
                if out_type == "google_docs"
                else f"{workflow_name} — {conn_label} Export"
            )
            exported_artifacts.append(
                {
                    "connector_id": matched_conn.get("id") if matched_conn else None,
                    "connector_type": out_type,
                    "connector_name": conn_label,
                    "title": artifact_title,
                    "format": "markdown" if out_type == "google_docs" else "csv",
                    "preview": artifact_content,
                    "content": artifact_content,
                }
            )
            total_time_saved_mins += 20.0
            node_packets[nid] = {
                "active": True,
                "records": merged_records,
                "exceptions": merged_exceptions,
                "processed_items": merged_items,
                "findings": branch_notes,
                "cost_savings_usd": branch_savings,
            }
            step_results.append(
                {
                    "step": idx,
                    "node_id": nid,
                    "kind": kind,
                    "label": label,
                    "status": "completed",
                    "cost_savings_usd": 0.0,
                    "time_saved_minutes": 20.0,
                    "summary": f"Delivered {len(merged_items) or len(branch_notes)} finding(s) (${branch_savings:,.2f}) to {conn_label}.",
                    "output": {
                        "connector_name": conn_label,
                        "records_processed": len(merged_records),
                        "findings_delivered": len(branch_notes),
                        "artifact_preview": artifact_content[:400],
                    },
                }
            )

    # Optionally ask Antigravity Orchestrator Agent to synthesize an executive swarm briefing
    orchestrator_summary = (
        f"Swarm '{workflow_name}' flowed {len(org_records)} records across {len(step_results)} workflow blocks "
        f"({len([t for t in edge_traces if t['triggered']])}/{len(edge_traces)} connections active), "
        f"identifying ${total_cost_savings:,.2f} in cost savings and saving ~{round(total_time_saved_mins / 60.0, 1)} hours."
    )
    sdk_meta: dict[str, Any] = {
        "sdk": "google-antigravity",
        "subagents_registered": allowed_subagent_names,
        "edge_traces": edge_traces,
        "mode": "deterministic-swarm" if not is_antigravity_live_configured() or dry_run else "antigravity-live-swarm",
    }

    if is_antigravity_live_configured() and not dry_run and subagent_configs:
        try:
            api_key = _get_api_key()
            with tempfile.TemporaryDirectory(prefix="agy_swarm_") as tmp_dir:
                cfg = LocalAgentConfig(
                    models=_build_model_targets(api_key, ThinkingLevel.MINIMAL),
                    api_key=api_key,
                    system_instructions=(
                        "You are the Manufacturing Swarm Coordinator. Summarize the executed pipeline findings in "
                        "2 crisp sentences highlighting verified dollar savings and hours saved. Never invent numbers."
                    ),
                    subagents=subagent_configs,
                    policies=_build_safe_policies([], allow_subagents=True),
                    capabilities=types.CapabilitiesConfig(
                        agent_behavior=types.AgentBehavior.MINIMAL,
                        enable_subagents=True,
                        max_subagent_depth=1,
                        allowed_subagents=allowed_subagent_names,
                        disabled_tools=_DISABLED_BUILTIN_TOOLS,
                    ),
                    budget_config=types.BudgetConfig(max_model_calls=4, max_total_tokens=20_000),
                    save_dir=tmp_dir,
                    app_data_dir=tmp_dir,
                    workspaces=[tmp_dir],
                )

                async def _summarize() -> tuple[str, int]:
                    async with Agent(cfg) as ag:
                        resp = await ag.chat(
                            f"Workflow: {workflow_name}\nTotal Cost Savings: ${total_cost_savings:,.2f}\n"
                            f"Time Saved: {total_time_saved_mins:.0f} mins\nFindings:\n"
                            + "\n".join(f"- {n}" for n in all_findings_notes[:12])
                        )
                        txt = (await resp.text() or "").strip()
                        usage = ag.conversation.total_usage
                        return txt, (getattr(usage, "total_token_count", 0) if usage else 0)

                live_text, tokens = _run_coro_sync(_summarize(), timeout_seconds=25.0)
                if live_text:
                    orchestrator_summary = live_text
                    sdk_meta["tokens_used"] = tokens
        except Exception as exc:
            logger.warning(f"Antigravity swarm coordinator summary fallback: {exc}")

    return {
        "workflow_name": workflow_name,
        "status": "completed",
        "sdk": "google-antigravity",
        "sdk_metadata": sdk_meta,
        "total_cost_savings_usd": round(total_cost_savings, 2),
        "total_time_saved_minutes": round(total_time_saved_mins, 1),
        "total_hours_saved": round(total_time_saved_mins / 60.0, 2),
        "orchestrator_summary": orchestrator_summary,
        "steps": step_results,
        "exported_artifacts": exported_artifacts,
    }


def _build_connector_artifact(
    out_type: str,
    workflow_name: str,
    total_cost_savings: float,
    total_time_saved_mins: float,
    findings_notes: list[str],
) -> str:
    if out_type == "google_sheets":
        lines = ["step,finding,workflow,cost_savings_usd,time_saved_mins"]
        for i, note in enumerate(findings_notes, start=1):
            safe_note = note.replace('"', '""')
            lines.append(
                f'{i},"{safe_note}","{workflow_name}",{total_cost_savings:.2f},{total_time_saved_mins:.1f}'
            )
        return "\n".join(lines)

    bullet_list = "\n".join(f"- {n}" for n in findings_notes) or "- All plant records reconciled cleanly."
    return (
        f"# Manufacturing Swarm Report: {workflow_name}\n\n"
        f"**Estimated Cost Savings:** ${total_cost_savings:,.2f}\n"
        f"**Estimated Time Saved:** {total_time_saved_mins:.0f} minutes ({total_time_saved_mins / 60.0:.1f} hrs)\n\n"
        f"## Verified Agent Findings\n{bullet_list}\n\n"
        f"*Generated by Google Antigravity Manufacturing Swarm — Pending Manager Sign-Off where threshold applies.*"
    )
