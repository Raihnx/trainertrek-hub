import { Check, X, Snowflake } from "lucide-react";
import { useDashboardStats, useMarkAttendance } from "@/lib/queries";
import { useAppStore } from "@/lib/app-store";
import { toast } from "sonner";

export function TodaySessions() {
  const month = useAppStore((s) => s.month);
  const stats = useDashboardStats(month);
  const mark = useMarkAttendance();

  const onMark = (client_id: string, status: "present" | "absent" | "freeze") => {
    mark.mutate(
      { client_id, status },
      {
        onSuccess: () => toast.success(`Marked ${status}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      }
    );
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">Today's sessions</h3>
          <p className="text-xs text-muted-foreground">{stats.todaysSessionsCount} pending</p>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">LIVE</span>
      </div>

      {stats.todaysSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 py-8 text-center text-sm text-muted-foreground">
          {stats.totalClients === 0 ? "No clients yet" : "All marked for today"}
        </div>
      ) : (
        <ul className="space-y-2">
          {stats.todaysSessions.map((c) => {
            const avatar = c.photo_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
            return (
              <li key={c.id} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5 transition hover:border-primary/30">
                <img src={avatar} alt={c.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-border" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.package_name ?? "—"}</div>
                </div>
                <button onClick={() => onMark(c.id, "present")} className="rounded-lg bg-success/15 p-2 text-success transition hover:bg-success/25" title="Present">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => onMark(c.id, "absent")} className="rounded-lg bg-destructive/15 p-2 text-destructive transition hover:bg-destructive/25" title="Absent">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={() => onMark(c.id, "freeze")} className="rounded-lg bg-warning/15 p-2 text-warning transition hover:bg-warning/25" title="Freeze">
                  <Snowflake className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
