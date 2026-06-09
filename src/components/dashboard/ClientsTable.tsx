import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "./StatusBadge";
import type { ClientWithDerived } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { TRAINING_HOURS, formatHourRange } from "@/lib/time-slots";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

function avatarFor(c: ClientWithDerived) {
  return c.photo_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
}

export function ClientsTable({
  clients,
  compact = false,
  attendancePct,
}: {
  clients: ClientWithDerived[];
  compact?: boolean;
  attendancePct?: Map<string, number>;
}) {
  const rows = compact ? clients.slice(0, 6) : clients;
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center text-sm text-muted-foreground">
        No clients yet. Add your first client to get started.
      </div>
    );
  }
  const qc = useQueryClient();
  const changeHour = async (c: ClientWithDerived, hourStr: string) => {
    const next = hourStr === "" ? null : Number(hourStr);
    const { error } = await supabase.from("clients").update({ preferred_hour: next } as any).eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Updated time for ${c.name}`);
    await logAudit({
      action: "client.update_time",
      target_type: "client",
      target_id: c.id,
      target_label: c.name,
      description: next === null ? `Cleared favourable time for ${c.name}` : `Set favourable time for ${c.name} to ${formatHourRange(next)}`,
      metadata: { preferred_hour: next },
    });
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Package</th>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Days Left</th>
            <th className="px-4 py-3 font-semibold">Balance</th>
            <th className="px-4 py-3 font-semibold">Attendance</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const pct = attendancePct?.get(c.id) ?? 0;
            const hour = (c as any).preferred_hour as number | null | undefined;
            return (
              <tr key={c.id} className="border-b border-border/60 transition hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={avatarFor(c)} alt={c.name} className="h-9 w-9 rounded-lg object-cover ring-1 ring-border" />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(c.joining_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground/85">{c.package_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={hour ?? ""}
                    onChange={(e) => changeHour(c, e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    title="Favourable time"
                  >
                    <option value="">—</option>
                    {TRAINING_HOURS.map((h) => (
                      <option key={h} value={h}>{formatHourRange(h)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 font-medium">{c.days_left}d</td>
                <td className="px-4 py-3">
                  <span className={c.balance > 0 ? "font-semibold text-warning" : "text-muted-foreground"}>
                    ₹{c.balance.toLocaleString("en-IN")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium tabular-nums">{Math.round(pct)}%</span>
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
