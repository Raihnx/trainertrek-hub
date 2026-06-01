import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart2, AlertTriangle, Wallet } from "lucide-react";
import { clients } from "@/lib/mock-data";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — ForgeFit" }, { name: "description", content: "Attendance, expiry and payment reports." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const reports = [
    { icon: FileBarChart2, title: "Client Attendance Report",  desc: "Detailed attendance log per client for the month.", count: clients.length, accent: "text-primary" },
    { icon: AlertTriangle, title: "Expiring Membership Report", desc: "Clients whose memberships expire in the next 30 days.", count: clients.filter(c => c.status === "expiring").length, accent: "text-warning" },
    { icon: Wallet,        title: "Pending Payment Report",     desc: "Outstanding balances across all PT clients.", count: clients.filter(c => c.packageAmount - c.amountPaid > 0).length, accent: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Export performance and financial reports.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg bg-[image:var(--gradient-primary)] px-3 py-2 text-xs font-semibold text-primary-foreground">View</button>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold hover:bg-muted/50">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Recent exports</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Report</th>
                <th className="px-4 py-3 font-semibold">Generated</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Format</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {[
                ["Attendance Report",         "30 May 2026", "May 2026", "CSV"],
                ["Expiring Memberships",      "28 May 2026", "Jun 2026", "PDF"],
                ["Pending Payments",          "25 May 2026", "May 2026", "XLSX"],
                ["Monthly Incentive Summary", "01 May 2026", "Apr 2026", "PDF"],
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{row[0]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row[1]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row[2]}</td>
                  <td className="px-4 py-3"><span className="rounded-md bg-muted/40 px-2 py-0.5 text-xs font-semibold">{row[3]}</span></td>
                  <td className="px-4 py-3 text-right"><button className="text-xs font-semibold text-primary hover:underline">Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
