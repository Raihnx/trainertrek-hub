import { buildCalendar, type AttStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const colorMap: Record<AttStatus, string> = {
  present: "bg-success/20 text-success border-success/40 hover:bg-success/30",
  absent:  "bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30",
  freeze:  "bg-warning/20 text-warning border-warning/40 hover:bg-warning/30",
  future:  "bg-muted/30 text-muted-foreground border-border",
  none:    "bg-muted/20 text-muted-foreground/60 border-border",
};

const legend = [
  { label: "Present", cls: "bg-success" },
  { label: "Absent", cls: "bg-destructive" },
  { label: "Freeze", cls: "bg-warning" },
  { label: "Future", cls: "bg-muted-foreground/40" },
];

export function AttendanceCalendar() {
  const days = buildCalendar();
  const today = new Date();
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDow = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const todayDay = today.getDate();

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">Attendance calendar</h3>
          <p className="text-xs text-muted-foreground">{monthName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", l.cls)} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`p${i}`} />)}
        {days.map((d) => (
          <button
            key={d.day}
            className={cn(
              "relative aspect-square rounded-lg border text-xs font-medium transition",
              colorMap[d.status],
              d.day === todayDay && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            {d.day}
          </button>
        ))}
      </div>
    </div>
  );
}
