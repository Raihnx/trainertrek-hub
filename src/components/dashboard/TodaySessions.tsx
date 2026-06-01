import { Check, X, Clock } from "lucide-react";
import { todaySessions } from "@/lib/mock-data";

export function TodaySessions() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">Today's sessions</h3>
          <p className="text-xs text-muted-foreground">{todaySessions.length} scheduled</p>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">LIVE</span>
      </div>

      <ul className="space-y-2">
        {todaySessions.map((c) => (
          <li
            key={c.id}
            className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5 transition hover:border-primary/30"
          >
            <img src={c.photo} alt={c.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-border" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.name}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {c.sessionTime}
              </div>
            </div>
            <button className="rounded-lg bg-success/15 p-2 text-success transition hover:bg-success/25" aria-label="Mark present">
              <Check className="h-4 w-4" />
            </button>
            <button className="rounded-lg bg-destructive/15 p-2 text-destructive transition hover:bg-destructive/25" aria-label="Mark absent">
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
