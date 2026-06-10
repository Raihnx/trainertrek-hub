import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAttendance, useMarkAttendance, useFreezeRange } from "@/lib/queries";
import { toast } from "sonner";
import { eligibleDaysFor } from "@/lib/incentive";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, X, Snowflake, Loader2 } from "lucide-react";

type AttStatus = "present" | "absent" | "freeze" | "future" | "none";

const colorMap: Record<AttStatus, string> = {
  present: "bg-success/20 text-success border-success/40 hover:bg-success/30",
  absent:  "bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30",
  freeze:  "bg-warning/20 text-warning border-warning/40 hover:bg-warning/30",
  future:  "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50",
  none:    "bg-muted/10 text-muted-foreground/70 border-border hover:bg-muted/30",
};

const legend = [
  { label: "Present", cls: "bg-success" },
  { label: "Absent",  cls: "bg-destructive" },
  { label: "Freeze",  cls: "bg-warning" },
  { label: "Paid", cls: "bg-slate-300" },
  { label: "Unpaid", cls: "bg-slate-300" },
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
  const freezeRange = useFreezeRange();

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeDays, setFreezeDays] = useState(1);
  const [freezeStartISO, setFreezeStartISO] = useState<string | null>(null);

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

  const joinD = new Date(joiningDate);
  joinD.setHours(0, 0, 0, 0);
  const paidDays = eligibleDaysFor(totalDays, amountPaid, packageAmount);
  // Sorted freeze ISOs from current month for shifting the membership window
  const freezeISOs = useMemo(
    () => Array.from(attMap.entries()).filter(([, s]) => s === "freeze").map(([d]) => d).sort(),
    [attMap],
  );


  const isoOf = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const markStatus = (iso: string, status: "present" | "absent") => {
    mark.mutate(
      { client_id: clientId, status, date: iso },
      {
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSuccess: () => toast.success(`Marked ${status}`),
      },
    );
  };

  const openFreezeDialog = (iso: string) => {
    setFreezeStartISO(iso);
    setFreezeDays(1);
    setFreezeOpen(true);
  };

  const confirmFreeze = () => {
    if (!freezeStartISO || freezeDays <= 0) return;
    freezeRange.mutate(
      { client_id: clientId, startDate: freezeStartISO, days: freezeDays },
      {
        onSuccess: () => {
          toast.success(`Freezed ${freezeDays} day${freezeDays === 1 ? "" : "s"}`);
          setFreezeOpen(false);
          setFreezeStartISO(null);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      },
    );
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Attendance — {monthName}</h3>
          <p className="text-xs text-muted-foreground">
            Tap a day to choose Present, Absent, or Freeze. Freeze can be applied to today or upcoming days.
          </p>
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
          date.setHours(0, 0, 0, 0);
          const iso = isoOf(day);
          const st = attMap.get(iso);
          const isPast = day < todayDay;
          const isToday = day === todayDay;
          const isFuture = day > todayDay;

          // Compute membership shade with freeze-extension.
          // Days before this date that are frozen (in current month, within membership) shift the window.
          const dayOffset = Math.floor((date.getTime() - joinD.getTime()) / 86400000);
          let shade: "paid" | "pending" | null = null;
          if (dayOffset >= 0) {
            const freezesBefore = freezeISOs.filter((d) => d < iso && new Date(d) >= joinD).length;
            const effective = dayOffset - freezesBefore;
            if (effective < paidDays) shade = "paid";
            else if (effective < totalDays) shade = "pending";
          }

          const status: AttStatus = st ?? (isFuture ? "future" : "none");
          const baseShade =
            !st && shade === "paid" ? "bg-slate-200/40 border-slate-400/30 text-foreground hover:bg-slate-200/60"
            : !st && shade === "pending" ? "bg-slate-200/40 border-slate-400/30 text-foreground hover:bg-slate-200/60"
            : "";

          const cellBtn = (
            <button
              disabled={isPast && !st}
              className={cn(
                "relative aspect-square w-full rounded-lg border text-xs font-medium transition",
                st ? colorMap[status] : (baseShade || colorMap[status]),
                isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                isPast && !st && "cursor-not-allowed opacity-60",
              )}
            >
              {!st && shade === "pending" ? (
                <span className="text-destructive">{day}</span>
              ) : (
                day
              )}
              {st === "freeze" && (
                <Snowflake className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-warning" />
              )}
            </button>
          );

          // Past days without a record are locked
          if (isPast && !st) {
            return <div key={day}>{cellBtn}</div>;
          }

          return (
            <Popover key={day}>
              <PopoverTrigger asChild>{cellBtn}</PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="center">
                <div className="px-1 pb-2 text-[11px] text-muted-foreground">
                  {date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!isToday}
                    onClick={() => markStatus(iso, "present")}
                    className="justify-start gap-2 text-success hover:bg-success/10 hover:text-success"
                  >
                    <Check className="h-4 w-4" /> Present {!isToday && <span className="ml-auto text-[10px] text-muted-foreground">today only</span>}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!isToday}
                    onClick={() => markStatus(iso, "absent")}
                    className="justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" /> Absent {!isToday && <span className="ml-auto text-[10px] text-muted-foreground">today only</span>}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openFreezeDialog(iso)}
                    className="justify-start gap-2 text-warning hover:bg-warning/10 hover:text-warning"
                  >
                    <Snowflake className="h-4 w-4" /> Freeze…
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Freeze membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Starting{" "}
              <span className="font-medium text-foreground">
                {freezeStartISO ? new Date(freezeStartISO).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </span>
              . The selected day and the following days will be marked as Freeze.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="freeze-days">Total freeze days</Label>
              <Input
                id="freeze-days"
                type="number"
                min={1}
                max={90}
                value={freezeDays}
                onChange={(e) => setFreezeDays(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFreezeOpen(false)}>Cancel</Button>
            <Button onClick={confirmFreeze} disabled={freezeRange.isPending}>
              {freezeRange.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply freeze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
