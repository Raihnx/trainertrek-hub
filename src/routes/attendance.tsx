import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useClients, useAttendance } from "@/lib/queries";
import { useAppStore } from "@/lib/app-store";
import { TodaySessions } from "@/components/dashboard/TodaySessions";
import { monthRange } from "@/lib/incentive";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — ZAK's GYM" }, { name: "description", content: "Track session attendance for all PT clients." }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const month = useAppStore((s) => s.month);
  const { data: clients = [] } = useClients();
  const { data: att = [] } = useAttendance(month);
  const monthLabel = monthRange(month).label;

  const byClient = useMemo(() => {
    const m = new Map<string, { present: number; absent: number; freeze: number }>();
    for (const a of att) {
      const cur = m.get(a.client_id) ?? { present: 0, absent: 0, freeze: 0 };
      if (a.status === "present") cur.present++;
      else if (a.status === "absent") cur.absent++;
      else if (a.status === "freeze") cur.freeze++;
      m.set(a.client_id, cur);
    }
    return m;
  }, [att]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mark sessions for today. Showing {monthLabel}.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="glass rounded-2xl p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Client summary</h2>
            {clients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center text-sm text-muted-foreground">
                No clients yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {clients.map((c) => {
                  const s = byClient.get(c.id) ?? { present: 0, absent: 0, freeze: 0 };
                  const total = s.present + s.absent + s.freeze;
                  const pct = total ? Math.round((s.present / total) * 100) : 0;
                  const photo = c.photo_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                  return (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                      <img src={photo} alt="" className="h-11 w-11 rounded-lg object-cover ring-1 ring-border" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                          <span>{s.present} present · {s.absent} absent · {s.freeze} freeze</span>
                          <span className="font-semibold text-foreground">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <TodaySessions />
      </div>
    </div>
  );
}
