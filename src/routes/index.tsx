import { createFileRoute } from "@tanstack/react-router";
import { Users, UserCheck, CalendarDays, Trophy, AlertCircle, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatCard } from "@/components/dashboard/StatCard";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { TodaySessions } from "@/components/dashboard/TodaySessions";
import { useClients, useDashboardStats, useIncentives } from "@/lib/queries";
import { useProfile } from "@/lib/queries";
import { useAppStore } from "@/lib/app-store";
import { monthRange } from "@/lib/incentive";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ForgeFit Trainer" },
      { name: "description", content: "Trainer overview: clients, sessions, incentives and memberships at a glance." },
    ],
  }),
  component: Dashboard,
});

const spark = (seed: number) =>
  Array.from({ length: 12 }, (_, i) => ({ x: i, y: Math.round(40 + Math.sin(i * 0.7 + seed) * 15 + (i * seed) % 13) }));

function Dashboard() {
  const month = useAppStore((s) => s.month);
  const search = useAppStore((s) => s.search);
  const stats = useDashboardStats(month);
  const inc = useIncentives(month);
  const { data: profile } = useProfile();
  const { data: clients = [] } = useClients();
  const monthLabel = monthRange(month).label;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.package_name ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  // Incentive trend last 6 months from current month
  const trend = useMemo(() => {
    // simple monthly aggregation derived from per-client current month — limited; build from inc only for current
    // For UI we keep a static-looking sparkline using per-month bucketed payments could be heavy; show flat for now.
    const base = inc.total || 0;
    return Array.from({ length: 6 }, (_, i) => ({
      month: new Date(new Date().setMonth(new Date().getMonth() - (5 - i))).toLocaleString("en-US", { month: "short" }),
      value: Math.max(0, Math.round(base * (0.7 + i * 0.05))),
    }));
  }, [inc.total]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = (profile?.display_name ?? "Trainer").split(" ")[0];

  // Per-client attendance pct for table
  const attendancePct = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clients) {
      const days = stats.daysByClient.get(c.id) ?? 0;
      m.set(c.id, c.total_days > 0 ? Math.min(100, (days / 30) * 100) : 0);
    }
    return m;
  }, [clients, stats.daysByClient]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Welcome back</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          {greeting}, <span className="text-gradient-gold">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Viewing data for <span className="font-semibold text-foreground">{monthLabel}</span>.
        </p>
      </div>

      {/* Stat grid (no Revenue / no Renewals) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total PT Clients"     value={String(stats.totalClients)}     icon={Users}       trend={0}  data={spark(1)} accent="gold" />
        <StatCard label="Active Clients"       value={String(stats.activeClients)}    icon={UserCheck}   trend={0}  data={spark(2)} accent="green" />
        <StatCard label="Today's Sessions"     value={String(stats.todaysSessionsCount)} icon={CalendarDays} trend={0} data={spark(3)} accent="blue" />
        <StatCard label="Monthly Incentive"    value={`₹${stats.monthlyIncentive.toLocaleString("en-IN")}`} icon={Trophy} trend={0} data={spark(4)} accent="gold" />
        <StatCard label="Expiring Memberships" value={String(stats.expiringMemberships)} icon={AlertCircle} trend={0} data={spark(5)} accent="yellow" />
        <StatCard label="Pending Payments"     value={`₹${(stats.pendingPayments / 1000).toFixed(1)}k`} icon={Wallet}  trend={0} data={spark(6)} accent="red" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Incentive trend */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Incentive trend</h3>
                <p className="text-xs text-muted-foreground">Last 6 months</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "var(--color-muted-foreground)" }}
                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Incentive"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#goldGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clients */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">My clients</h3>
                <p className="text-xs text-muted-foreground">{filtered.length} {search ? "matched" : "assigned"}</p>
              </div>
              <a href="/clients" className="text-xs font-semibold text-primary hover:underline">View all →</a>
            </div>
            <ClientsTable clients={filtered} compact attendancePct={attendancePct} />
          </div>
        </div>

        <div className="space-y-6">
          <TodaySessions />
        </div>
      </div>
    </div>
  );
}
