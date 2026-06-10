import { createFileRoute, Link } from "@tanstack/react-router";
import { FileBarChart2, AlertTriangle, Wallet, Download, Lock, CalendarCheck } from "lucide-react";
import { useMemo } from "react";
import { useClients } from "@/lib/queries";
import { useCan } from "@/lib/permissions";
import { downloadCSV } from "@/lib/csv";
import { downloadPDFReport, type PdfColumn } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { monthRange } from "@/lib/incentive";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ForgeFit" },
      { name: "description", content: "Attendance, expiry and payment reports." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: clients = [] } = useClients();
  const month = useAppStore((s) => s.month);
  const monthLabel = monthRange(month).label;
  const canView = useCan("reports.view");
  const canExport = useCan("reports.export");

  // Payments for the month (admins/receptionists see all; trainers see own via RLS)
  const { data: payments = [] } = useQuery({
    queryKey: ["report-payments", month],
    enabled: canView.allowed,
    queryFn: async () => {
      const { start, end } = monthRange(month);
      const { data, error } = await supabase
        .from("payments")
        .select("amount, paid_at, client_id, trainer_id, method, note")
        .gte("paid_at", start)
        .lte("paid_at", end + "T23:59:59")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const clientName = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const expiring = clients.filter((c) => c.status === "expiring");
  const expired = clients.filter((c) => c.status === "expired");
  const pending = clients.filter((c) => c.balance > 0);

  if (canView.isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!canView.allowed) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <Lock className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">Reports unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You don't have permission to view reports. Ask an admin to grant <code className="rounded bg-muted px-1.5">reports.view</code>.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">← Back to dashboard</Link>
      </div>
    );
  }

  const exportClientsAttendance = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const rows = clients.map((c) => ({
      name: c.name,
      phone: c.phone ?? "",
      package: c.package_name ?? "",
      joining_date: c.joining_date,
      expiry_date: c.expiry_date,
      total_days: c.total_days,
      eligible_days: c.eligible_days,
      status: c.status,
      days_left: c.days_left,
    }));
    downloadCSV(`clients-${month}.csv`, rows);
    toast.success(`Exported ${rows.length} clients`);
  };

  const exportExpiring = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const rows = [...expiring, ...expired].map((c) => ({
      name: c.name,
      phone: c.phone ?? "",
      package: c.package_name ?? "",
      expiry_date: c.expiry_date,
      days_left: c.days_left,
      status: c.status,
    }));
    downloadCSV(`expiring-memberships-${month}.csv`, rows);
    toast.success(`Exported ${rows.length} memberships`);
  };

  const exportPending = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const rows = pending.map((c) => ({
      name: c.name,
      phone: c.phone ?? "",
      package: c.package_name ?? "",
      package_amount: c.package_amount,
      amount_paid: c.amount_paid,
      balance: c.balance,
      paid_pct: c.paid_pct.toFixed(1),
    }));
    downloadCSV(`pending-payments-${month}.csv`, rows);
    toast.success(`Exported ${rows.length} accounts`);
  };

  const exportPayments = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const rows = (payments as any[]).map((p) => ({
      paid_at: p.paid_at,
      client: clientName.get(p.client_id) ?? p.client_id,
      amount: p.amount,
      method: p.method ?? "",
      note: p.note ?? "",
    }));
    downloadCSV(`payments-${month}.csv`, rows);
    toast.success(`Exported ${rows.length} payments`);
  };

  const totalCollected = (payments as any[]).reduce((s, p) => s + Number(p.amount), 0);

  const exportClientsPDF = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const cols: PdfColumn[] = [
      { header: "Client", key: "name" },
      { header: "Phone", key: "phone" },
      { header: "Package", key: "package" },
      { header: "Joined", key: "joining_date" },
      { header: "Expiry", key: "expiry_date" },
      { header: "Days", key: "total_days", align: "right" },
      { header: "Status", key: "status" },
    ];
    const rows = clients.map((c) => ({
      name: c.name,
      phone: c.phone ?? "—",
      package: c.package_name ?? "—",
      joining_date: c.joining_date,
      expiry_date: c.expiry_date,
      total_days: c.total_days,
      status: c.status,
    }));
    downloadPDFReport({
      filename: `client-roster-${month}.pdf`,
      title: "Client Roster",
      subtitle: `Active membership snapshot · ${monthLabel}`,
      columns: cols,
      rows,
      summary: [
        { label: "Total clients", value: String(clients.length) },
        { label: "Expiring", value: String(expiring.length) },
        { label: "Expired", value: String(expired.length) },
      ],
    });
    toast.success("PDF downloaded");
  };

  const exportExpiringPDF = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const cols: PdfColumn[] = [
      { header: "Client", key: "name" },
      { header: "Phone", key: "phone" },
      { header: "Package", key: "package" },
      { header: "Expiry", key: "expiry_date" },
      { header: "Days left", key: "days_left", align: "right" },
      { header: "Status", key: "status" },
    ];
    const rows = [...expiring, ...expired].map((c) => ({
      name: c.name,
      phone: c.phone ?? "—",
      package: c.package_name ?? "—",
      expiry_date: c.expiry_date,
      days_left: c.days_left,
      status: c.status,
    }));
    downloadPDFReport({
      filename: `expiring-memberships-${month}.pdf`,
      title: "Expiring Memberships",
      subtitle: `Renewal pipeline · ${monthLabel}`,
      columns: cols,
      rows,
      summary: [
        { label: "Expiring soon", value: String(expiring.length) },
        { label: "Already expired", value: String(expired.length) },
      ],
    });
    toast.success("PDF downloaded");
  };

  const exportPendingPDF = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const cols: PdfColumn[] = [
      { header: "Client", key: "name" },
      { header: "Phone", key: "phone" },
      { header: "Package", key: "package" },
      { header: "Amount", key: "package_amount", align: "right" },
      { header: "Paid", key: "amount_paid", align: "right" },
      { header: "Balance", key: "balance", align: "right" },
      { header: "Paid %", key: "paid_pct", align: "right" },
    ];
    const rows = pending.map((c) => ({
      name: c.name,
      phone: c.phone ?? "—",
      package: c.package_name ?? "—",
      package_amount: `₹${Number(c.package_amount).toLocaleString("en-IN")}`,
      amount_paid: `₹${Number(c.amount_paid).toLocaleString("en-IN")}`,
      balance: `₹${c.balance.toLocaleString("en-IN")}`,
      paid_pct: `${c.paid_pct.toFixed(1)}%`,
    }));
    const totalBalance = pending.reduce((s, c) => s + c.balance, 0);
    downloadPDFReport({
      filename: `pending-payments-${month}.pdf`,
      title: "Pending Payments",
      subtitle: `Outstanding balances · ${monthLabel}`,
      columns: cols,
      rows,
      summary: [
        { label: "Accounts", value: String(pending.length) },
        { label: "Total due", value: `₹${totalBalance.toLocaleString("en-IN")}` },
      ],
    });
    toast.success("PDF downloaded");
  };

  const exportPaymentsPDF = () => {
    if (!canExport.allowed) return toast.error("You don't have export permission");
    const cols: PdfColumn[] = [
      { header: "Date", key: "paid_at" },
      { header: "Client", key: "client" },
      { header: "Method", key: "method" },
      { header: "Note", key: "note" },
      { header: "Amount", key: "amount", align: "right" },
    ];
    const rows = (payments as any[]).map((p) => ({
      paid_at: new Date(p.paid_at).toLocaleDateString("en-IN"),
      client: clientName.get(p.client_id) ?? p.client_id,
      method: p.method ?? "—",
      note: p.note ?? "—",
      amount: `₹${Number(p.amount).toLocaleString("en-IN")}`,
    }));
    downloadPDFReport({
      filename: `payments-${month}.pdf`,
      title: `Payments Collected`,
      subtitle: `Receipts journal · ${monthLabel}`,
      columns: cols,
      rows,
      summary: [
        { label: "Transactions", value: String((payments as any[]).length) },
        { label: "Total collected", value: `₹${totalCollected.toLocaleString("en-IN")}` },
      ],
    });
    toast.success("PDF downloaded");
  };

  const reports = [
    {
      icon: FileBarChart2,
      title: "Client roster",
      desc: "Full client list with packages, eligibility and status.",
      count: clients.length,
      accent: "text-primary",
      onExportCSV: exportClientsAttendance,
      onExportPDF: exportClientsPDF,
    },
    {
      icon: AlertTriangle,
      title: "Expiring memberships",
      desc: "Memberships expiring soon or already expired.",
      count: expiring.length + expired.length,
      accent: "text-warning",
      onExportCSV: exportExpiring,
      onExportPDF: exportExpiringPDF,
    },
    {
      icon: Wallet,
      title: "Pending payments",
      desc: "Outstanding balances across clients.",
      count: pending.length,
      accent: "text-destructive",
      onExportCSV: exportPending,
      onExportPDF: exportPendingPDF,
    },
    {
      icon: CalendarCheck,
      title: `Payments — ${monthLabel}`,
      desc: `₹${totalCollected.toLocaleString("en-IN")} collected this month.`,
      count: (payments as any[]).length,
      accent: "text-success",
      onExportCSV: exportPayments,
      onExportPDF: exportPaymentsPDF,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick views, CSV &amp; PDF exports for <span className="font-semibold text-foreground">{monthLabel}</span>.
          </p>
        </div>
        {!canExport.allowed && !canExport.isLoading && (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Export disabled — needs <code className="rounded bg-muted px-1">reports.export</code>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((r) => (
          <div key={r.title} className="glass group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary/30">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/30">
                <r.icon className={`h-5 w-5 ${r.accent}`} />
              </div>
              <span className="rounded-md bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{r.count} rows</span>
            </div>
            <h3 className="mt-4 font-display text-base font-semibold">{r.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.desc}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canExport.allowed || r.count === 0}
                onClick={r.onExportCSV}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                disabled={!canExport.allowed || r.count === 0}
                onClick={r.onExportPDF}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>
        ))}
      </div>


      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Pending payments</h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center text-sm text-muted-foreground">All clients fully paid.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Package</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-4 py-3 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.package_name ?? "—"}</td>
                    <td className="px-4 py-3 text-success">₹{Number(c.amount_paid).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 font-semibold text-warning">₹{c.balance.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
