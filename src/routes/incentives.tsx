import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Users, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIncentives } from "@/lib/queries";
import { useAppStore } from "@/lib/app-store";
import { monthRange } from "@/lib/incentive";

export const Route = createFileRoute("/incentives")({
  head: () => ({ meta: [{ title: "Incentives — ZAK's GYM" }, { name: "description", content: "Track incentives and revenue." }] }),
  component: IncentivesPage,
});

function IncentivesPage() {
  const month = useAppStore((s) => s.month);
  const inc = useIncentives(month);
  const monthLabel = monthRange(month).label;
  const maxInc = Math.max(1, ...inc.perClient.map((p) => p.incentive));

  const cards = [
    { label: "Total Monthly Incentive", value: `₹${inc.total.toLocaleString("en-IN")}`, icon: Trophy, accent: "var(--color-primary)" },
    { label: "Avg Per Client",          value: `₹${inc.avgPerClient.toLocaleString("en-IN")}`, icon: Users, accent: "var(--color-info)" },
    { label: "Revenue (Paid)",          value: `₹${inc.revenue.toLocaleString("en-IN")}`, icon: TrendingUp, accent: "var(--color-success)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Incentive <span className="text-gradient-gold">Dashboard</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">For <span className="font-semibold text-foreground">{monthLabel}</span>. Cap ₹2000 / client / month.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="glass relative overflow-hidden rounded-2xl p-5">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: c.accent }} />
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <c.icon className="h-5 w-5" style={{ color: c.accent }} />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Incentive by client — {monthLabel}</h2>
        {inc.perClient.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center text-sm text-muted-foreground">
            No clients yet.
          </div>
        ) : (
          <>
            <div className="mb-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inc.perClient.slice(0, 10).map((p) => ({ name: p.client.name.split(" ")[0], value: p.incentive }))} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  <Bar dataKey="value" fill="url(#barGold)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {inc.perClient.map((p, i) => {
                const photo = p.client.photo_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.client.name)}`;
                return (
                  <Link
                    to="/clients/$id"
                    params={{ id: p.client.id }}
                    key={p.client.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-3 transition hover:border-primary/40"
                  >
                    <div className="w-6 text-center font-display text-sm font-semibold text-muted-foreground">{i + 1}</div>
                    <img src={photo} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium">{p.client.name}</div>
                        <div className="font-display text-sm font-semibold text-primary">₹{p.incentive.toLocaleString("en-IN")}</div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${(p.incentive / maxInc) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground">{p.days}d present</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
