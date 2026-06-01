import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { clients } from "@/lib/mock-data";

export const Route = createFileRoute("/memberships")({
  head: () => ({ meta: [{ title: "Memberships — ForgeFit" }, { name: "description", content: "Track active, expiring and expired client memberships." }] }),
  component: MembershipsPage,
});

function MembershipsPage() {
  const groups = [
    { key: "active",   title: "Active",        list: clients.filter(c => c.status === "active") },
    { key: "expiring", title: "Expiring Soon", list: clients.filter(c => c.status === "expiring") },
    { key: "expired",  title: "Expired",       list: clients.filter(c => c.status === "expired") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Memberships</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage validity, freeze periods and renewals.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.key} className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">{g.title}</h2>
              <span className="rounded-md bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{g.list.length}</span>
            </div>
            <ul className="space-y-3">
              {g.list.map((c) => {
                const balance = c.packageAmount - c.amountPaid;
                return (
                  <li key={c.id} className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex items-center gap-3">
                      <img src={c.photo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium">{c.name}</div>
                          <StatusBadge status={c.status} />
                        </div>
                        <div className="text-xs text-muted-foreground">{c.package}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="rounded-md bg-background/40 py-1.5">
                        <div className="font-semibold text-foreground">{c.daysLeft}d</div>
                        <div className="text-muted-foreground">left</div>
                      </div>
                      <div className="rounded-md bg-background/40 py-1.5">
                        <div className="font-semibold text-warning">{c.freezeDays}</div>
                        <div className="text-muted-foreground">freeze</div>
                      </div>
                      <div className="rounded-md bg-background/40 py-1.5">
                        <div className={`font-semibold ${balance > 0 ? "text-warning" : "text-success"}`}>₹{(balance/1000).toFixed(1)}k</div>
                        <div className="text-muted-foreground">balance</div>
                      </div>
                    </div>
                    <Link to="/clients/$id" params={{ id: c.id }} className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-border bg-background/40 py-1.5 text-xs font-semibold hover:border-primary/40 hover:text-primary">
                      Manage
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
