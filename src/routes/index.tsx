import { createFileRoute } from "@tanstack/react-router";
import { Users, UserCheck, CalendarDays, Trophy, AlertCircle, Wallet, Shield, TrendingUp, Building2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatCard } from "@/components/dashboard/StatCard";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { TodaySessions } from "@/components/dashboard/TodaySessions";
import { useClients, useDashboardStats, useIncentives } from "@/lib/queries";
import { useProfile } from "@/lib/queries";
import { useAppStore } from "@/lib/app-store";
import { monthRange } from "@/lib/incentive";
import { useMemo } from "react";
import { useIsAdmin, useUserRole } from "@/lib/useRole";
import { useAdminOrgMetrics } from "@/lib/admin-queries";
import { ReceptionistDashboard } from "@/components/dashboard/ReceptionistDashboard";
import { TrainerAvailability } from "@/components/dashboard/TrainerAvailability";

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
  const { data: role } = useUserRole();
  const stats = useDashboardStats(month);
  const inc = useIncentives(month);
  const { data: profile } = useProfile();
  const { data: clients = [] } = useClients();
  const { isAdmin } = useIsAdmin();
  const { data: org } = useAdminOrgMetrics(month);
  const monthLabel = monthRange(month).label;

  if (role === "receptionist") return <ReceptionistDashboard />;

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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{isAdmin ? "Admin dashboard" : "Trainer dashboard"}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          {greeting}, <span className="text-gradient-gold">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Viewing data for <span className="font-semibold text-foreground">{monthLabel}</span>.
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total PT Clients"     value={String(stats.ptClients)}        icon={Users}       trend={0}  data={spark(1)} accent="gold" />
        <StatCard label="Total GT Clients"     value={String(stats.gtClients)}        icon={Users}       trend={0}  data={spark(7)} accent="blue" />
        <StatCard label="Active Clients"       value={String(stats.activeClients)}    icon={UserCheck}   trend={0}  data={spark(2)} accent="green" />
        <StatCard label="Today's Sessions"     value={String(stats.todaysSessionsCount)} icon={CalendarDays} trend={0} data={spark(3)} accent="blue" />
        <StatCard label="Monthly Incentive"    value={`₹${stats.monthlyIncentive.toLocaleString("en-IN")}`} icon={Trophy} trend={0} data={spark(4)} accent="gold" />
        <StatCard label="Expiring Memberships" value={String(stats.expiringMemberships)} icon={AlertCircle} trend={0} data={spark(5)} accent="yellow" />
        <StatCard label="Pending Payments"     value={`₹${(stats.pendingPayments / 1000).toFixed(1)}k`} icon={Wallet}  trend={0} data={spark(6)} accent="red" />
      </div>

      {/* Admin-only organization overview */}
      {isAdmin && org && (
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Organization overview</h2>
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Admin</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <OrgKpi icon={Building2} label="Total clients" value={String(org.totalClients)} />
            <OrgKpi icon={Wallet} label="Revenue (total paid)" value={`₹${org.revenueAll.toLocaleString("en-IN")}`} />
            <OrgKpi icon={TrendingUp} label="Revenue (month)" value={`₹${org.revenueMonth.toLocaleString("en-IN")}`} />
            <OrgKpi icon={AlertCircle} label="Outstanding" value={`₹${org.outstanding.toLocaleString("en-IN")}`} />
            <OrgKpi icon={Trophy} label="Incentive (month)" value={`₹${org.monthlyIncentiveAll.toLocaleString("en-IN")}`} />
            <OrgKpi icon={Users} label="Staff" value={`${org.totalTrainers + org.totalReceptionists}`} sub={`${org.activeStaff} active`} />
          </div>
          {org.trainerStats.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top trainers this month</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 font-medium">Trainer</th>
                      <th className="py-2 font-medium">Clients</th>
                      <th className="py-2 font-medium">Revenue</th>
                      <th className="py-2 font-medium">Incentive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org.trainerStats.slice(0, 5).map((t) => (
                      <tr key={t.trainer_id} className="border-b border-border/50">
                        <td className="py-2 font-mono text-xs">{t.trainer_id.slice(0, 8)}…</td>
                        <td className="py-2">{t.clientCount}</td>
                        <td className="py-2">₹{t.revenue.toLocaleString("en-IN")}</td>
                        <td className="py-2 text-primary">₹{t.incentive.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {isAdmin && <TrainerAvailability />}

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

function OrgKpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" /> {label}
      </div>
      <div className="mt-1 font-display text-lg font-semibold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
