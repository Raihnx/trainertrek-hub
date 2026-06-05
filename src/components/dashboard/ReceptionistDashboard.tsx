import { useMemo } from "react";
import { Wallet, Users, AlertCircle, BadgeCheck, CalendarCheck, TrendingUp, Phone } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { useAdminOrgMetrics } from "@/lib/admin-queries";
import { useClients, useProfile } from "@/lib/queries";
import { monthRange, clientStatus, daysLeft } from "@/lib/incentive";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

export function ReceptionistDashboard() {
  const month = useAppStore((s) => s.month);
  const { data: profile } = useProfile();
  const { data: org } = useAdminOrgMetrics(month);
  const { data: clients = [] } = useClients();
  const monthLabel = monthRange(month).label;

  const expiringSoon = useMemo(
    () =>
      clients
        .map((c) => ({ ...c, status: clientStatus(c.expiry_date), dleft: daysLeft(c.expiry_date) }))
        .filter((c) => c.status === "expiring" || c.status === "expired")
        .sort((a, b) => a.dleft - b.dleft)
        .slice(0, 8),
    [clients],
  );

  const outstandingClients = useMemo(
    () =>
      clients
        .map((c) => ({ ...c, balance: Number(c.package_amount) - Number(c.amount_paid) }))
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 8),
    [clients],
  );

  const firstName = (profile?.display_name ?? "Reception").split(" ")[0];
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Receptionist dashboard</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          {greeting}, <span className="text-gradient-gold">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reception view for <span className="font-semibold text-foreground">{monthLabel}</span>.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} label="Members" value={String(org?.totalClients ?? clients.length)} />
        <Kpi icon={BadgeCheck} label="Active" value={String(org?.active ?? 0)} />
        <Kpi icon={AlertCircle} label="Expiring" value={String(org?.expiring ?? 0)} accent="yellow" />
        <Kpi icon={CalendarCheck} label="Expired" value={String(org?.expired ?? 0)} accent="red" />
        <Kpi icon={Wallet} label="Collected (mo)" value={`₹${(org?.revenueMonth ?? 0).toLocaleString("en-IN")}`} />
        <Kpi icon={TrendingUp} label="Today" value={`₹${(org?.revenueToday ?? 0).toLocaleString("en-IN")}`} accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Expiring / Expired memberships — renewal queue */}
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Renewal queue</h3>
              <p className="text-xs text-muted-foreground">Members to follow up with</p>
            </div>
            <Link to="/memberships" className="text-xs font-semibold text-primary hover:underline">All →</Link>
          </div>
          {expiringSoon.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No memberships expiring soon. 🎉</p>
          ) : (
            <div className="space-y-2">
              {expiringSoon.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      <span>· {c.package_name}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {c.status === "expired" ? (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        Expired {Math.abs(c.dleft)}d
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning/40 text-warning">
                        {c.dleft}d left
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending payments */}
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Outstanding balances</h3>
              <p className="text-xs text-muted-foreground">Members with pending payments</p>
            </div>
            <Link to="/clients" className="text-xs font-semibold text-primary hover:underline">Collect →</Link>
          </div>
          {outstandingClients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">All balances cleared. ✨</p>
          ) : (
            <div className="space-y-2">
              {outstandingClients.map((c) => (
                <Link
                  key={c.id}
                  to="/clients/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.package_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-semibold text-destructive">
                      ₹{c.balance.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      of ₹{Number(c.package_amount).toLocaleString("en-IN")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  accent?: "green" | "yellow" | "red";
}) {
  const tone =
    accent === "green"
      ? "text-success"
      : accent === "yellow"
        ? "text-warning"
        : accent === "red"
          ? "text-destructive"
          : "text-primary";
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone}`} /> {label}
      </div>
      <div className="mt-1.5 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
