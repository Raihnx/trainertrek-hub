import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Client } from "@/lib/mock-data";

export function ClientsTable({ clients, compact = false }: { clients: Client[]; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Package</th>
            <th className="px-4 py-3 font-semibold">Days Left</th>
            <th className="px-4 py-3 font-semibold">Balance</th>
            <th className="px-4 py-3 font-semibold">Attendance</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {(compact ? clients.slice(0, 6) : clients).map((c) => {
            const balance = c.packageAmount - c.amountPaid;
            return (
              <tr key={c.id} className="border-b border-border/60 transition hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={c.photo} alt={c.name} className="h-9 w-9 rounded-lg object-cover ring-1 ring-border" />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">Joined {new Date(c.joiningDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground/85">{c.package}</td>
                <td className="px-4 py-3 font-medium">{c.daysLeft}d</td>
                <td className="px-4 py-3">
                  <span className={balance > 0 ? "font-semibold text-warning" : "text-muted-foreground"}>
                    ₹{balance.toLocaleString("en-IN")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                        style={{ width: `${c.attendancePct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">{c.attendancePct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/clients/$id"
                    params={{ id: c.id }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-foreground/90 transition hover:border-primary/40 hover:text-primary"
                  >
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
