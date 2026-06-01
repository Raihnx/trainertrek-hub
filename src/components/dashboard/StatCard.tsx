import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: number; // percentage
  data: { x: number; y: number }[];
  accent?: "gold" | "green" | "blue" | "red" | "yellow";
}

const accentMap = {
  gold:   { stroke: "var(--color-primary)",     fill: "var(--color-primary)" },
  green:  { stroke: "var(--color-success)",     fill: "var(--color-success)" },
  blue:   { stroke: "var(--color-info)",        fill: "var(--color-info)" },
  red:    { stroke: "var(--color-destructive)", fill: "var(--color-destructive)" },
  yellow: { stroke: "var(--color-warning)",     fill: "var(--color-warning)" },
};

export function StatCard({ label, value, icon: Icon, trend, data, accent = "gold" }: Props) {
  const a = accentMap[accent];
  const up = trend >= 0;
  const gid = `g-${label.replace(/\s/g, "")}-${accent}`;

  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
        style={{ background: a.fill }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border"
          style={{ background: `color-mix(in oklab, ${a.fill} 12%, transparent)` }}
        >
          <Icon className="h-5 w-5" style={{ color: a.fill }} />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
          up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(trend)}%
        </div>
        <div className="h-10 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={a.fill} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={a.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="y" stroke={a.stroke} strokeWidth={2} fill={`url(#${gid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
