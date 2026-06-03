import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart2, AlertTriangle, Wallet } from "lucide-react";
import { useClients } from "@/lib/queries";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — ForgeFit" }, { name: "description", content: "Attendance, expiry and payment reports." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: clients = [] } = useClients();

  const reports = [
    { icon: FileBarChart2, title: "Client Attendance Report",  desc: "Attendance log per client for the month.", count: clients.length, accent: "text-primary" },
    { icon: AlertTriangle, title: "Expiring Membership Report", desc: "Memberships expiring in the next 14 days.", count: clients.filter((c) => c.status === "expiring").length, accent: "text-warning" },
    { icon: Wallet,        title: "Pending Payment Report",     desc: "Outstanding balances across all clients.", count: clients.filter((c) => c.balance > 0).length, accent: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick views of attendance, expiry and payment data.</p>
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
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Pending payments</h2>
        {clients.filter((c) => c.balance > 0).length === 0 ? (
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
                {clients.filter((c) => c.balance > 0).map((c) => (
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
