import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Wallet, Snowflake, Activity } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { clients, freezeHistory } from "@/lib/mock-data";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const Route = createFileRoute("/clients/$id")({
  head: ({ params }) => {
    const c = clients.find((x) => x.id === params.id);
    return { meta: [{ title: `${c?.name ?? "Client"} — ForgeFit` }, { name: "description", content: `Membership and attendance details for ${c?.name ?? "client"}.` }] };
  },
  loader: ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) throw notFound();
    return { client };
  },
  component: ClientDetail,
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <p className="text-muted-foreground">Client not found.</p>
      <Link to="/clients" className="mt-4 inline-block text-sm font-semibold text-primary">← Back to clients</Link>
    </div>
  ),
});

function ClientDetail() {
  const { client: c } = Route.useLoaderData();
  const balance = c.packageAmount - c.amountPaid;
  const paidPct = (c.amountPaid / c.packageAmount) * 100;
  const usedDays = c.totalDays - c.daysLeft;

  const pieData = [
    { name: "Present", value: c.present, color: "var(--color-success)" },
    { name: "Absent",  value: c.absent,  color: "var(--color-destructive)" },
    { name: "Freeze",  value: c.freeze,  color: "var(--color-warning)" },
  ];
  const trendData = [
    { m: "Jan", present: 18, absent: 3 },
    { m: "Feb", present: 21, absent: 2 },
    { m: "Mar", present: 19, absent: 4 },
    { m: "Apr", present: 22, absent: 1 },
    { m: "May", present: 20, absent: 5 },
    { m: "Jun", present: 16, absent: 2 },
  ];

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      {/* Header card */}
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <img src={c.photo} alt={c.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/40" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{c.name}</h1>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{c.package}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span><Calendar className="mr-1 inline h-3.5 w-3.5" />Joined {new Date(c.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span><Calendar className="mr-1 inline h-3.5 w-3.5" />Expires {new Date(c.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <button className="rounded-lg bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
            Mark attendance
          </button>
        </div>
      </div>

      {/* Membership */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-5 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Membership</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Package Amount", value: `₹${c.packageAmount.toLocaleString("en-IN")}` },
            { label: "Amount Paid",    value: `₹${c.amountPaid.toLocaleString("en-IN")}`,    accent: "text-success" },
            { label: "Remaining",      value: `₹${balance.toLocaleString("en-IN")}`,         accent: balance > 0 ? "text-warning" : "text-muted-foreground" },
            { label: "Eligible Days",  value: `${c.eligibleDays}` },
            { label: "Total Days",     value: `${c.totalDays}` },
            { label: "Freeze Days",    value: `${c.freezeDays}`,                              accent: "text-warning" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-1 font-display text-xl font-semibold ${s.accent ?? ""}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Membership timeline</span>
            <span>{usedDays} / {c.totalDays + c.freezeDays} days</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-0 bg-warning" style={{ width: `${paidPct * (c.totalDays / (c.totalDays + c.freezeDays))}%` }} />
            <div className="absolute inset-y-0 bg-info" style={{ left: `${paidPct * (c.totalDays / (c.totalDays + c.freezeDays))}%`, width: `${(100 - paidPct) * (c.totalDays / (c.totalDays + c.freezeDays))}%` }} />
            <div className="absolute inset-y-0 right-0 bg-warning/40" style={{ width: `${(c.freezeDays / (c.totalDays + c.freezeDays)) * 100}%` }} />
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-warning" />Paid days</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-info" />Remaining</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-warning/40" />Freeze extension</span>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">Attendance breakdown</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-success/10 p-3"><div className="text-2xl font-semibold text-success">{c.present}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Present</div></div>
            <div className="rounded-lg bg-destructive/10 p-3"><div className="text-2xl font-semibold text-destructive">{c.absent}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Absent</div></div>
            <div className="rounded-lg bg-warning/10 p-3"><div className="text-2xl font-semibold text-warning">{c.freeze}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Freeze</div></div>
          </div>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
                  {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-semibold">Monthly attendance trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="present" stackId="a" fill="var(--color-success)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="absent" stackId="a" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Freeze history */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Snowflake className="h-4 w-4 text-warning" />
          <h3 className="font-display text-base font-semibold">Freeze history</h3>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {freezeHistory.map((f) => (
                <tr key={f.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3 text-foreground/85">{f.reason}</td>
                  <td className="px-4 py-3"><span className="rounded-md bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">{f.duration}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
