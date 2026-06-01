import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Users, TrendingUp, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { incentiveBreakdown, incentiveData, clients } from "@/lib/mock-data";

export const Route = createFileRoute("/incentives")({
  head: () => ({ meta: [{ title: "Incentives — ForgeFit" }, { name: "description", content: "Track incentives, revenue and renewals." }] }),
  component: IncentivesPage,
});

function IncentivesPage() {
  const cards = [
    { label: "Total Monthly Incentive", value: `₹${incentiveBreakdown.total.toLocaleString("en-IN")}`, icon: Trophy, accent: "var(--color-primary)" },
    { label: "Incentive Per Client",    value: `₹${incentiveBreakdown.perClient.toLocaleString("en-IN")}`, icon: Users, accent: "var(--color-info)" },
    { label: "Revenue Generated",       value: `₹${(incentiveBreakdown.revenue/1000).toFixed(0)}k`, icon: TrendingUp, accent: "var(--color-success)" },
    { label: "PT Renewals",             value: String(incentiveBreakdown.renewals), icon: RefreshCw, accent: "var(--color-warning)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Incentive <span className="text-gradient-gold">Dashboard</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">Your earnings, renewals and revenue this month.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <h2 className="mb-4 font-display text-lg font-semibold">Monthly incentive earnings</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incentiveData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
              <Bar dataKey="value" fill="url(#barGold)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Incentive by client</h2>
        <div className="space-y-2">
          {clients.slice(0, 6).map((c, i) => {
            const inc = Math.round(c.packageAmount * 0.08);
            const max = Math.round(60000 * 0.08);
            return (
              <div key={c.id} className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-3">
                <div className="w-6 text-center font-display text-sm font-semibold text-muted-foreground">{i + 1}</div>
                <img src={c.photo} alt="" className="h-9 w-9 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="font-display text-sm font-semibold text-primary">₹{inc.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${(inc/max) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
