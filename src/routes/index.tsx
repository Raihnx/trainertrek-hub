import { createFileRoute } from "@tanstack/react-router";
import { Users, UserCheck, CalendarDays, Trophy, AlertCircle, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatCard } from "@/components/dashboard/StatCard";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { TodaySessions } from "@/components/dashboard/TodaySessions";
import { AttendanceCalendar } from "@/components/dashboard/AttendanceCalendar";
import { clients, overviewStats, spark, incentiveData } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ForgeFit Trainer" },
      { name: "description", content: "Trainer overview: clients, sessions, incentives and memberships at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Welcome back</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Good morning, <span className="text-gradient-gold">Alex</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's how your floor is performing today.</p>
        </div>
        <div className="glass flex items-center gap-4 rounded-xl px-4 py-2.5 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">This month revenue</div>
            <div className="font-display text-lg font-semibold">₹3,12,000</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Renewals</div>
            <div className="font-display text-lg font-semibold text-success">+7</div>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total PT Clients"      value={String(overviewStats.totalClients)}                icon={Users}       trend={12}  data={spark(1)} accent="gold" />
        <StatCard label="Active Clients"        value={String(overviewStats.activeClients)}               icon={UserCheck}   trend={8}   data={spark(2)} accent="green" />
        <StatCard label="Today's Sessions"      value={String(overviewStats.todaysSessions)}              icon={CalendarDays}trend={4}   data={spark(3)} accent="blue" />
        <StatCard label="Monthly Incentive"     value={`₹${(overviewStats.monthlyIncentive/1000).toFixed(1)}k`} icon={Trophy} trend={22}  data={spark(4)} accent="gold" />
        <StatCard label="Expiring Memberships"  value={String(overviewStats.expiringMemberships)}         icon={AlertCircle} trend={-3}  data={spark(5)} accent="yellow" />
        <StatCard label="Pending Payments"      value={`₹${(overviewStats.pendingPayments/1000).toFixed(0)}k`}  icon={Wallet}    trend={-9}  data={spark(6)} accent="red" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Revenue chart */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Incentive trend</h3>
                <p className="text-xs text-muted-foreground">Last 6 months</p>
              </div>
              <div className="flex gap-2 text-xs">
                {["1M", "3M", "6M", "1Y"].map((p, i) => (
                  <button key={p} className={`rounded-md border border-border px-2.5 py-1 font-medium transition ${i === 2 ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incentiveData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
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

          {/* Clients table */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">My clients</h3>
                <p className="text-xs text-muted-foreground">{clients.length} assigned PT clients</p>
              </div>
              <a href="/clients" className="text-xs font-semibold text-primary hover:underline">View all →</a>
            </div>
            <ClientsTable clients={clients} compact />
          </div>
        </div>

        <div className="space-y-6">
          <TodaySessions />
          <AttendanceCalendar />
        </div>
      </div>
    </div>
  );
}
