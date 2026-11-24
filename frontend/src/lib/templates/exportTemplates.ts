export interface TemplateDefinition {
  id: string;
  name: string;
  record_type: string;
  description: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  service_ticket: {
    id: "service_ticket",
    name: "Material Work Order & PO Template",
    record_type: "service_ticket",
    description:
      "Tracks shop-floor work orders, raw material issues, contracted rate, and planned quantities.",
    filename: "mfg_work_orders_po_template",
    headers: [
      "ticket_number",
      "customer_name",
      "service_date",
      "quantity",
      "unit",
      "rate",
      "amount",
      "notes",
    ],
    rows: [
      [
        "WO-4401",
        "Apex Construction & Metals",
        "2026-11-12",
        4.5,
        "tons",
        151.11,
        680.0,
        "304 Stainless CNC Bracket Batch A",
      ],
      [
        "WO-4410",
        "Metro Automotive Tier-1",
        "2026-11-14",
        6.8,
        "tons",
        50.0,
        340.0,
        "6061 Aluminum Extrusion Lot",
      ],
      [
        "WO-4415",
        "Vanguard Industrial Supply",
        "2026-11-16",
        2.0,
        "runs",
        225.0,
        450.0,
        "Precision Laser Cut Housing",
      ],
    ],
  },
  invoice: {
    id: "invoice",
    name: "Supplier & Customer Invoice Template",
    record_type: "invoice",
    description:
      "ERP billing & AP invoices audited by CostSentry for 3-way PO rate creep and duplicate billing.",
    filename: "mfg_invoices_template",
    headers: [
      "invoice_number",
      "customer_name",
      "invoice_date",
      "quantity",
      "unit",
      "rate",
      "amount",
      "related_ticket",
    ],
    rows: [
      [
        "INV-9021",
        "Apex Construction & Metals",
        "2026-11-12",
        4.5,
        "tons",
        200.0,
        900.0,
        "WO-4401",
      ],
      [
        "INV-9024",
        "Metro Automotive Tier-1",
        "2026-11-14",
        6.8,
        "tons",
        50.0,
        340.0,
        "WO-4410",
      ],
      [
        "INV-9028",
        "Summit Stamping & Tool",
        "2026-11-17",
        1.0,
        "lot",
        420.0,
        420.0,
        "WO-4411",
      ],
    ],
  },
  load_record: {
    id: "load_record",
    name: "Receiving Scale & Dock Inspection Template",
    record_type: "load_record",
    description:
      "Certified receiving dock floor-scale slips compared by BOMGuard against PO and BOM standard weights.",
    filename: "mfg_receiving_scale_slips_template",
    headers: [
      "scale_ticket_id",
      "customer_name",
      "weigh_date",
      "net_tons",
      "unit",
      "rate",
      "total_charge",
      "material_type",
    ],
    rows: [
      [
        "RCV-110",
        "Metro Automotive Tier-1",
        "2026-11-14",
        4.0,
        "tons",
        50.0,
        200.0,
        "6061 Aluminum Billet",
      ],
      [
        "RCV-114",
        "Apex Construction & Metals",
        "2026-11-12",
        4.5,
        "tons",
        151.11,
        680.0,
        "304L Cold Rolled Steel",
      ],
      [
        "RCV-118",
        "Titan Polymer Molding",
        "2026-11-18",
        11.2,
        "tons",
        65.0,
        728.0,
        "HDPE Injection Resin",
      ],
    ],
  },
  dispatch_record: {
    id: "dispatch_record",
    name: "Production Schedule & Machine Cell Template",
    record_type: "dispatch_record",
    description:
      "Shop-floor CNC / assembly shift assignments checked by LinePulse to detect unlogged changeovers.",
    filename: "mfg_production_schedule_template",
    headers: [
      "dispatch_id",
      "customer_name",
      "scheduled_date",
      "units",
      "unit_type",
      "unit_rate",
      "estimated_value",
      "cell_status",
    ],
    rows: [
      [
        "SCH-771",
        "Summit Stamping & Tool",
        "2026-11-16",
        1.0,
        "run",
        0.0,
        0.0,
        "Completed CNC Cell B (ERP Showed Cancelled)",
      ],
      [
        "SCH-774",
        "Apex Construction & Metals",
        "2026-11-12",
        1.0,
        "run",
        150.0,
        150.0,
        "Completed",
      ],
      [
        "SCH-779",
        "Vanguard Industrial Supply",
        "2026-11-16",
        1.0,
        "run",
        225.0,
        225.0,
        "Completed",
      ],
    ],
  },
};

function sanitizeCsvCell(val: string | number): string {
  let raw = String(val ?? "");
  if (/^[=+\-@\t\r]/.test(raw)) {
    raw = `'${raw}`;
  }
  return `"${raw.replace(/"/g, '""')}"`;
}

export function downloadTemplate(
  templateId: string,
  format: "csv" | "excel" = "csv",
): void {
  const template = TEMPLATES[templateId] || TEMPLATES.service_ticket;
  const rows = [template.headers, ...template.rows];
  const csvContent = rows
    .map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(","))
    .join("\n");

  const bom = format === "excel" ? "\uFEFF" : "";
  const mime =
    format === "excel" ? "text/csv;charset=utf-8;" : "text/csv;charset=utf-8;";
  const ext = "csv";
  const blob = new Blob([bom + csvContent], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${template.filename}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const REQUIRED_TEMPLATE_COLUMNS = [
  {
    field: "external_reference",
    label: "Work Order / PO / Invoice #",
    required: true,
    aliases: "ticket_number, po_number, invoice_number, rcv_id, reference",
    description: "Unique PO, work order, receiving slip, or invoice number",
  },
  {
    field: "customer_reference",
    label: "Supplier / Customer Name",
    required: true,
    aliases: "supplier_name, customer_name, vendor, account",
    description: "Supplier or customer account name",
  },
  {
    field: "service_date",
    label: "Transaction Date",
    required: true,
    aliases: "service_date, receive_date, invoice_date, scheduled_date",
    description: "Transaction date (YYYY-MM-DD)",
  },
  {
    field: "quantity",
    label: "Quantity / Weight",
    required: false,
    aliases: "quantity, qty, net_tons, weight, units",
    description: "Measured count, weight, or machine run hours",
  },
  {
    field: "rate",
    label: "Unit Rate ($)",
    required: false,
    aliases: "rate, unit_price, unit_rate",
    description: "Contracted unit price in USD",
  },
  {
    field: "amount",
    label: "Total Amount ($)",
    required: true,
    aliases: "amount, total, invoice_amount",
    description: "Total line or invoice amount in USD",
  },
];
