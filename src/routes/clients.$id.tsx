import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Wallet, Activity, Phone, Plus, Loader2, Lock } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useMemo } from "react";
import { useClient, useAttendance, useUpdateClient } from "@/lib/queries";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AttendanceCalendarLive } from "@/components/clients/AttendanceCalendarLive";
import { incentiveFor, eligibleDaysFor, currentMonthISO } from "@/lib/incentive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";

export const Route = createFileRoute("/clients/$id")({
  head: () => ({ meta: [{ title: "Client — ForgeFit" }, { name: "description", content: "Membership and attendance details." }] }),
  component: ClientDetail,
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <p className="text-muted-foreground">Client not found.</p>
      <Link to="/clients" className="mt-4 inline-block text-sm font-semibold text-primary">← Back to clients</Link>
    </div>
  ),
});

function ClientDetail() {
  console.log("CLIENT DETAIL PAGE LOADED");
  const { id } = Route.useParams();
  const { data: c, isLoading } = useClient(id);
  const month = currentMonthISO();
  const { data: att = [] } = useAttendance(month, id);
  const update = useUpdateClient();
  const { allowed: canRecordPayment } = useCan("payments.create");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);

  const counts = useMemo(() => {
    let present = 0, absent = 0, freeze = 0;
    for (const a of att) {
      if (a.status === "present") present++;
      else if (a.status === "absent") absent++;
      else if (a.status === "freeze") freeze++;
    }
    return { present, absent, freeze };
  }, [att]);

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!c) throw notFound();

  const balance = c.balance;
  const eligibleDays = eligibleDaysFor(c.total_days, Number(c.amount_paid), Number(c.package_amount));
  const incentive = incentiveFor(counts.present);

  const pieData = [
    { name: "Present", value: counts.present, color: "var(--color-success)" },
    { name: "Absent",  value: counts.absent,  color: "var(--color-destructive)" },
    { name: "Freeze",  value: counts.freeze,  color: "var(--color-warning)" },
  ];
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { m: d.toLocaleString("en-US", { month: "short" }), present: 0, absent: 0 };
  });
  // simple placeholder trend — could be expanded with multi-month fetch later
  trendData[5].present = counts.present;
  trendData[5].absent = counts.absent;

  const photo = c.photo_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;

  const recordPayment = () => {
    if (payAmount <= 0) return;
    const newPaid = Number(c.amount_paid) + payAmount;
    const capped = Math.min(newPaid, Number(c.package_amount));
    update.mutate(
      { id: c.id, patch: { amount_paid: capped, eligible_days: eligibleDaysFor(c.total_days, capped, Number(c.package_amount)) } },
      {
        onSuccess: () => { toast.success("Payment recorded"); setPayOpen(false); setPayAmount(0); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      {/* Header card */}
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <img src={photo} alt={c.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/40" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{c.name}</h1>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{c.package_name ?? "—"}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {c.phone && <span><Phone className="mr-1 inline h-3.5 w-3.5" />{c.phone}</span>}
              <span><Calendar className="mr-1 inline h-3.5 w-3.5" />Joined {new Date(c.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span><Calendar className="mr-1 inline h-3.5 w-3.5" />Expires {new Date(c.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          {canRecordPayment && (
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
                <Plus className="mr-1.5 h-4 w-4" /> Record payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">Current balance: ₹{balance.toLocaleString("en-IN")}</div>
                <Label>Amount (₹)</Label>
                <Input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
              </div>
              <DialogFooter>
                <Button onClick={recordPayment} disabled={update.isPending || payAmount <= 0}>
                  {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Membership */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-5 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Membership & payments</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Package Amount", value: `₹${Number(c.package_amount).toLocaleString("en-IN")}` },
            { label: "Amount Paid",    value: `₹${Number(c.amount_paid).toLocaleString("en-IN")}`, accent: "text-success" },
            { label: "Remaining",      value: `₹${balance.toLocaleString("en-IN")}`, accent: balance > 0 ? "text-warning" : "text-muted-foreground" },
            { label: "Eligible Days",  value: `${eligibleDays}` },
            { label: "Total Days",     value: `${c.total_days}` },
            { label: "Days Left",      value: `${c.days_left}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-1 font-display text-xl font-semibold ${s.accent ?? ""}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive attendance calendar */}
      <AttendanceCalendarLive
        clientId={c.id}
        joiningDate={c.joining_date}
        totalDays={c.total_days}
        amountPaid={Number(c.amount_paid)}
        packageAmount={Number(c.package_amount)}
      />

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">This month</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-success/10 p-3"><div className="text-2xl font-semibold text-success">{counts.present}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Present</div></div>
            <div className="rounded-lg bg-destructive/10 p-3"><div className="text-2xl font-semibold text-destructive">{counts.absent}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Absent</div></div>
            <div className="rounded-lg bg-warning/10 p-3"><div className="text-2xl font-semibold text-warning">{counts.freeze}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Freeze</div></div>
          </div>
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Incentive generated</div>
            <div className="font-display text-2xl font-semibold text-primary">₹{incentive.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-muted-foreground">Cap ₹2000 / client / month</div>
          </div>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={3} stroke="none">
                  {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-semibold">Attendance trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="present" stackId="a" fill="var(--color-success)" />
                <Bar dataKey="absent" stackId="a" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
