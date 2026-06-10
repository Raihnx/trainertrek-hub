import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfColumn = { header: string; key: string; align?: "left" | "right" | "center" };

export type PdfReportOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  brand?: string;
  rows: Record<string, any>[];
  columns: PdfColumn[];
  summary?: { label: string; value: string }[];
};

const BRAND = "FORGEFIT";
const PRIMARY: [number, number, number] = [16, 24, 40];
const ACCENT: [number, number, number] = [212, 175, 55]; // gold

export function downloadPDFReport(opts: PdfReportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Header band
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 70, pageW, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(opts.brand ?? BRAND, margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text("Trainer Operations • Confidential", margin, 50);

  const today = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  doc.text(today, pageW - margin, 32, { align: "right" });

  // Title
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(opts.title, margin, 110);
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(opts.subtitle, margin, 128);
  }

  let cursorY = opts.subtitle ? 150 : 132;

  // Summary cards
  if (opts.summary && opts.summary.length) {
    const cardW = (pageW - margin * 2 - 12 * (opts.summary.length - 1)) / opts.summary.length;
    opts.summary.forEach((s, i) => {
      const x = margin + i * (cardW + 12);
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(x, cursorY, cardW, 50, 6, 6, "FD");
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(s.label.toUpperCase(), x + 12, cursorY + 18);
      doc.setTextColor(...PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(s.value, x + 12, cursorY + 38);
    });
    cursorY += 70;
  }

  // Table
  autoTable(doc, {
    startY: cursorY,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((r) => opts.columns.map((c) => formatCell(r[c.key]))),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: PRIMARY },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    columnStyles: Object.fromEntries(
      opts.columns.map((c, i) => [i, { halign: c.align ?? "left" }]),
    ),
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Footer
      const ph = doc.internal.pageSize.getHeight();
      const pw = doc.internal.pageSize.getWidth();
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, ph - 36, pw - margin, ph - 36);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.setFont("helvetica", "normal");
      doc.text(`${opts.brand ?? BRAND} • ${opts.title}`, margin, ph - 20);
      const page = (doc as any).internal.getNumberOfPages();
      doc.text(`Page ${page}`, pw - margin, ph - 20, { align: "right" });
    },
  });

  if (opts.rows.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(140, 140, 140);
    doc.text("No records found for this report.", pageW / 2, pageH / 2, { align: "center" });
  }

  doc.save(opts.filename);
}

function formatCell(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString("en-IN");
  return String(v);
}
