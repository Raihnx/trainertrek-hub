import { createFileRoute } from "@tanstack/react-router";
import { AttendanceCalendar } from "@/components/dashboard/AttendanceCalendar";
import { TodaySessions } from "@/components/dashboard/TodaySessions";
import { clients } from "@/lib/mock-data";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — ForgeFit" }, { name: "description", content: "Track session attendance for all PT clients." }] }),
  component: AttendancePage,
});

function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mark and review session attendance for your clients.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><AttendanceCalendar /></div>
        <TodaySessions />
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Client attendance summary</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <img src={c.photo} alt="" className="h-11 w-11 rounded-lg object-cover ring-1 ring-border" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${c.attendancePct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{c.present} present · {c.absent} absent</span>
                  <span className="font-semibold text-foreground">{c.attendancePct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
