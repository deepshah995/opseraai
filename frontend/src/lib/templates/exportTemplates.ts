/**
 * Spreadsheet & CSV Template Exporter for OpsCheck AI.
 * Generates user-friendly, Excel-compatible templates with pre-filled realistic sample data.
 */

export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  fileName: string;
  recordType: string;
  headers: string[];
  requiredFields: string[];
  fieldExplanations: Record<string, string>;
  rows: string[][];
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  service_ticket: {
    id: "service_ticket",
    name: "Service Tickets Template",
    category: "Hauling & Field Services",
    description: "For roll-off dumpsters, compactor pulls, septic pumping, and recurring route pick-ups.",
    fileName: "opscheck_service_tickets_template.csv",
    recordType: "service_ticket",
    headers: [
      "ticket_number",
      "customer_name",
      "service_date",
      "quantity",
      "unit",
      "rate",
      "amount",
      "driver",
      "truck_id",
      "job_site",
      "notes",
    ],
    requiredFields: ["ticket_number", "customer_name", "service_date", "amount"],
    fieldExplanations: {
      ticket_number: "Unique Ticket # (e.g., TKT-1001)",
      customer_name: "Customer / Account Name",
      service_date: "Date of service (YYYY-MM-DD or MM/DD/YYYY)",
      quantity: "Quantity or weight (e.g. 8.5)",
      unit: "Unit of measure (tons, yards, pulls, gallons, hours)",
      rate: "Agreed price per unit in dollars (e.g. 80.00)",
      amount: "Total charge in dollars (e.g. 680.00)",
      driver: "Driver name (optional)",
      truck_id: "Truck number (optional)",
      job_site: "Service location / address (optional)",
      notes: "Additional job notes or container size (optional)",
    },
    rows: [
      [
        "TKT-4401",
        "Apex Construction LLC",
        "2026-10-24",
        "8.5",
        "tons",
        "80.00",
        "680.00",
        "Dave Vance",
        "TRK-104",
        "400 Industrial Pkwy",
        "30yd roll-off dumpster haul",
      ],
      [
        "TKT-7720",
        "BioPharm Chemical Labs",
        "2026-10-25",
        "2500",
        "gallons",
        "0.85",
        "2125.00",
        "Dave Vance",
        "TNK-55",
        "Building C Treatment Bay",
        "Industrial washwater collection",
      ],
      [
        "TKT-9912",
        "GreenValley Municipal Complex",
        "2026-10-26",
        "1.0",
        "pulls",
        "1450.00",
        "1450.00",
        "Marcus Cole",
        "TRK-201",
        "Main Transfer Bay",
        "Emergency weekend commercial compactor pull",
      ],
      [
        "TKT-5544",
        "Delta Logistics Hub",
        "2026-10-27",
        "6.0",
        "tons",
        "130.00",
        "780.00",
        "Carlos Mendez",
        "TRK-108",
        "Dock 14 Recycling",
        "Commercial cardboard baler haul",
      ],
    ],
  },
  invoice: {
    id: "invoice",
    name: "Customer Invoices Template",
    category: "Billing & Accounting",
    description: "For customer bills, line-item charges, and cross-referencing against driver tickets.",
    fileName: "opscheck_customer_invoices_template.csv",
    recordType: "invoice",
    headers: [
      "invoice_number",
      "customer_name",
      "invoice_date",
      "quantity",
      "unit",
      "rate",
      "amount",
      "ticket_numbers",
      "payment_terms",
    ],
    requiredFields: ["invoice_number", "customer_name", "invoice_date", "amount"],
    fieldExplanations: {
      invoice_number: "Invoice # generated in accounting (e.g. INV-9021)",
      customer_name: "Customer Name billed",
      invoice_date: "Date the invoice was issued",
      quantity: "Billed quantity (tons, pulls, etc.)",
      unit: "Unit of measurement",
      rate: "Billed rate per unit",
      amount: "Total billed dollars on this invoice line",
      ticket_numbers: "Service ticket numbers included in this bill (comma separated)",
      payment_terms: "Payment terms (e.g., Net 30, Due on Receipt)",
    },
    rows: [
      [
        "INV-9021",
        "Apex Construction LLC",
        "2026-10-25",
        "11.25",
        "tons",
        "80.00",
        "900.00",
        "TKT-4401",
        "Net 30",
      ],
      [
        "INV-8801",
        "Delta Logistics Hub",
        "2026-10-27",
        "6.0",
        "tons",
        "130.00",
        "780.00",
        "TKT-5544",
        "Net 30",
      ],
      [
        "INV-8802",
        "Delta Logistics Hub",
        "2026-10-28",
        "6.0",
        "tons",
        "130.00",
        "780.00",
        "TKT-5544",
        "Net 30",
      ],
      [
        "INV-9550",
        "Summit Materials Quarry",
        "2026-10-26",
        "1.0",
        "hauls",
        "420.00",
        "420.00",
        "TKT-3319",
        "Net 15",
      ],
    ],
  },
  load_record: {
    id: "load_record",
    name: "Scale & Disposal Receipts Template",
    category: "Landfill & Transfer Stations",
    description: "For gross/tare scale receipts, disposal manifests, and tipping fee expenses.",
    fileName: "opscheck_scale_receipts_template.csv",
    recordType: "load_record",
    headers: [
      "scale_ticket_no",
      "customer_name",
      "scale_date",
      "net_tons",
      "tipping_rate",
      "tipping_fee",
      "facility_name",
      "waste_type",
    ],
    requiredFields: ["scale_ticket_no", "customer_name", "scale_date", "net_tons", "tipping_fee"],
    fieldExplanations: {
      scale_ticket_no: "Scale / Manifest Ticket # from facility (e.g. SC-8812)",
      customer_name: "Customer associated with load",
      scale_date: "Date and time weighed at scale",
      net_tons: "Net weight in tons (Gross lbs minus Tare lbs / 2000)",
      tipping_rate: "Disposal fee charged per ton",
      tipping_fee: "Total disposal cost paid",
      facility_name: "Landfill or Transfer Station name",
      waste_type: "Type of waste disposed (C&D, MSW, Sludge, Scrap Metal)",
    },
    rows: [
      [
        "SC-8812",
        "Apex Construction LLC",
        "2026-10-24",
        "8.5",
        "30.00",
        "255.00",
        "Metro Transfer Station",
        "C&D Debris",
      ],
      [
        "MAN-3301",
        "BioPharm Chemical Labs",
        "2026-10-25",
        "7.5",
        "50.00",
        "375.00",
        "North Water Recovery",
        "Industrial Washwater",
      ],
      [
        "SC-9904",
        "Horizon Metal Works",
        "2026-10-26",
        "14.2",
        "34.00",
        "482.80",
        "County Landfill #4",
        "Heavy Ferrous Scrap",
      ],
    ],
  },
  dispatch_record: {
    id: "dispatch_record",
    name: "Dispatch Route Logs Template",
    category: "Fleet & Routing",
    description: "For scheduled routes, truck assignments, and driver log verification.",
    fileName: "opscheck_dispatch_logs_template.csv",
    recordType: "dispatch_record",
    headers: [
      "dispatch_id",
      "customer_name",
      "dispatch_date",
      "truck_id",
      "driver_name",
      "status",
      "rate",
      "amount",
      "scheduled_haul",
    ],
    requiredFields: ["dispatch_id", "customer_name", "dispatch_date", "amount"],
    fieldExplanations: {
      dispatch_id: "Dispatch route ID (e.g. DSP-6602)",
      customer_name: "Customer Name scheduled",
      dispatch_date: "Scheduled date",
      truck_id: "Assigned truck or roll-off rig",
      driver_name: "Assigned driver name",
      status: "Route status (completed, in_progress, scheduled)",
      rate: "Scheduled rate",
      amount: "Expected total revenue",
      scheduled_haul: "Description of scheduled haul",
    },
    rows: [
      [
        "DSP-6602",
        "Summit Materials Quarry",
        "2026-10-25",
        "TRK-208",
        "Ken Adams",
        "completed",
        "420.00",
        "420.00",
        "Morning Aggregate Haul",
      ],
      [
        "DSP-6603",
        "Horizon Metal Works",
        "2026-10-26",
        "TRK-108",
        "Carlos Mendez",
        "completed",
        "850.00",
        "850.00",
        "Metal Scrap Bin Exchange",
      ],
    ],
  },
};

/**
 * Trigger client-side download of a CSV or Excel-ready spreadsheet.
 * Includes UTF-8 BOM (\uFEFF) so Microsoft Excel opens it cleanly without character glitches.
 */
export function downloadTemplate(templateId: string, format: "csv" | "excel" = "csv"): void {
  const template = TEMPLATES[templateId] || TEMPLATES.service_ticket;
  
  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = template.headers.map(escapeCsv).join(",");
  const dataLines = template.rows.map((row) => row.map(escapeCsv).join(","));
  const csvContent = [headerLine, ...dataLines].join("\r\n");

  // UTF-8 BOM (\uFEFF) ensures Excel reads columns cleanly
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const ext = format === "excel" ? ".csv" : ".csv";
  link.setAttribute("href", url);
  link.setAttribute("download", template.fileName.replace(".csv", ext));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Standard required fields needed for exception reconciliation matching.
 */
export const REQUIRED_TEMPLATE_COLUMNS = [
  {
    field: "external_reference",
    label: "Ticket or Invoice #",
    description: "Unique identifier on the document (e.g. TKT-1001, INV-5002, SC-8812)",
    required: true,
  },
  {
    field: "customer_reference",
    label: "Customer / Account Name",
    description: "The name of the company or job site billed",
    required: true,
  },
  {
    field: "service_date",
    label: "Date of Service / Billing",
    description: "The date work was done or the invoice was generated",
    required: true,
  },
  {
    field: "amount",
    label: "Total Dollar Amount ($)",
    description: "Total charge (or calculated from Quantity × Rate)",
    required: true,
  },
  {
    field: "quantity",
    label: "Quantity / Weight",
    description: "Tons, yards, gallons, pulls, or hours",
    required: false,
  },
  {
    field: "rate",
    label: "Price per Unit ($)",
    description: "Agreed haul rate, tipping rate, or disposal price",
    required: false,
  },
  {
    field: "unit",
    label: "Unit of Measurement",
    description: "tons, pulls, yards, gallons, or hours",
    required: false,
  },
  {
    field: "status",
    label: "Record Status",
    description: "completed, billed, or pending",
    required: false,
  },
];
