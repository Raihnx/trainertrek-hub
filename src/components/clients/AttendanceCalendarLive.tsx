import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAttendance, useMarkAttendance } from "@/lib/queries";
import { toast } from "sonner";
import { eligibleDaysFor } from "@/lib/incentive";

type AttStatus = "present" | "absent" | "freeze" | "future" | "none";

const colorMap: Record<AttStatus, string> = {
  present: "bg-success/20 text-success border-success/40 hover:bg-success/30",
  absent:  "bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30",
  freeze:  "bg-warning/20 text-warning border-warning/40 hover:bg-warning/30",
  future:  "bg-muted/30 text-muted-foreground border-border cursor-not-allowed",
  none:    "bg-muted/10 text-muted-foreground/70 border-border hover:bg-muted/30",
};

const legend = [
  { label: "Present", cls: "bg-success" },
  { label: "Absent",  cls: "bg-destructive" },
  { label: "Freeze",  cls: "bg-warning" },
  { label: "Eligible", cls: "bg-primary/40" },
];

export function AttendanceCalendarLive({
  clientId,
  joiningDate,
  totalDays,
  amountPaid,
  packageAmount,
}: {
  clientId: string;
  joiningDate: string;
  totalDays: number;
  amountPaid: number;
  packageAmount: number;
}) {
  const today = new Date();
  const monthISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const { data: att = [] } = useAttendance(monthISO, clientId);
  const mark = useMarkAttendance();

  const attMap = useMemo(() => {
    const m = new Map<string, "present" | "absent" | "freeze">();
    for (const a of att) m.set(a.date, a.status as "present" | "absent" | "freeze");
    return m;
  }, [att]);

  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Eligible window: from joining_date for `eligibleDays` days, intersect this month
  const joinD = new Date(joiningDate);
  const eligibleDays = eligibleDaysFor(totalDays, amountPaid, packageAmount);
  const eligibleEnd = new Date(joinD);
  eligibleEnd.setDate(eligibleEnd.getDate() + eligibleDays - 1);

  const onClick = (day: number) => {
    if (day !== todayDay) {
      toast.error("Attendance can only be marked on the same day.");
      return;
    }
    const cur = attMap.get(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    const next: "present" | "absent" | "freeze" = cur === "present" ? "absent" : cur === "absent" ? "freeze" : "present";
    mark.mutate(
      { client_id: clientId, status: next },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") }
    );
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Attendance — {monthName}</h3>
          <p className="text-xs text-muted-foreground">Tap today's cell to cycle Present → Absent → Freeze. Past days are locked.</p>
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
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`p${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const date = new Date(year, month, day);
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const st = attMap.get(iso);
          const isFuture = day > todayDay;
          const inEligible = date >= joinD && date <= eligibleEnd;
          const status: AttStatus = st ?? (isFuture ? "future" : "none");
          const isToday = day === todayDay;
          return (
            <button
              key={day}
              disabled={isFuture || !isToday}
              onClick={() => onClick(day)}
              className={cn(
                "relative aspect-square rounded-lg border text-xs font-medium transition",
                colorMap[status],
                inEligible && !st && !isFuture && "bg-primary/10 border-primary/30",
                isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
