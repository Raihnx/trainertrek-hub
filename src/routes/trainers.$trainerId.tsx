import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Mail, Phone, Award, MapPin, Shield, Users, Trophy,
  Clock, Save, Loader2, CalendarCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, useIsAdmin } from "@/lib/useRole";
import { useAuth } from "@/lib/useAuth";
import { TRAINING_HOURS, formatHourRange, formatHour } from "@/lib/time-slots";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { currentMonthISO, monthRange, incentiveFor, clientStatus } from "@/lib/incentive";

export const Route = createFileRoute("/trainers/$trainerId")({
  head: () => ({
    meta: [{ title: "Trainer profile — FitProHub" }],
  }),
  component: TrainerProfilePage,
});

type TrainerProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  certifications: string | null;
  level: string | null;
  status: string | null;
  working_hours: number[] | null;
};

function useTrainerProfile(id: string) {
  return useQuery({
    queryKey: ["trainer-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,phone,address,specialization,certifications,level,status,working_hours")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TrainerProfile | null;
    },
  });
}

function useTrainerClients(id: string) {
  return useQuery({
    queryKey: ["trainer-clients", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,phone,package_name,package_amount,amount_paid,expiry_date,preferred_hour,status,trainer_id")
        .eq("trainer_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useTrainerIncentive(id: string) {
  const monthISO = currentMonthISO();
  return useQuery({
    queryKey: ["trainer-incentive", id, monthISO],
    queryFn: async () => {
      const { start, end } = monthRange(monthISO);
      const [attRes, payRes] = await Promise.all([
        supabase.from("attendance").select("client_id,status,date")
          .eq("trainer_id", id).gte("date", start).lte("date", end),
        supabase.from("payments").select("amount,paid_at")
          .eq("trainer_id", id).gte("paid_at", start).lte("paid_at", end + "T23:59:59"),
      ]);
      if (attRes.error) throw attRes.error;
      if (payRes.error) throw payRes.error;
      const perClient = new Map<string, number>();
      for (const a of (attRes.data ?? []) as any[]) {
        if (a.status !== "present") continue;
        perClient.set(a.client_id, (perClient.get(a.client_id) ?? 0) + 1);
      }
      let incentive = 0;
      for (const [, days] of perClient) incentive += incentiveFor(days);
      const revenue = (payRes.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      return {
        incentive: Math.round(incentive),
        revenue,
        activeClientsWithAttendance: perClient.size,
        monthLabel: monthRange(monthISO).label,
      };
    },
  });
}

function TrainerProfilePage() {
  const { trainerId } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { isAdmin } = useIsAdmin();

  const { data: profile, isLoading } = useTrainerProfile(trainerId);
  const { data: clients = [] } = useTrainerClients(trainerId);
  const { data: inc } = useTrainerIncentive(trainerId);

  const isSelf = user?.id === trainerId;
  const canEditHours = isAdmin || isSelf;
  const canView = isAdmin || role === "receptionist" || isSelf;

  const [hours, setHours] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.working_hours) setHours(new Set(profile.working_hours));
  }, [profile?.working_hours]);

  const dirty = useMemo(() => {
    const a = Array.from(hours).sort();
    const b = [...(profile?.working_hours ?? [])].sort();
    return a.length !== b.length || a.some((v, i) => v !== b[i]);
  }, [hours, profile]);

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading trainer…</div>;
  }

  if (!profile) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">Trainer not found</h2>
        <Link to="/trainers-overview" className="mt-4 inline-block text-sm font-semibold text-primary">← Back</Link>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">Restricted</h2>
        <p className="mt-1 text-sm text-muted-foreground">You don't have access to this trainer's profile.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">← Back</Link>
      </div>
    );
  }

  const name = profile.display_name || profile.email || "Trainer";
  const avatar = profile.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  const toggleHour = (h: number) => {
    const next = new Set(hours);
    if (next.has(h)) next.delete(h);
    else next.add(h);
    setHours(next);
  };

  const saveHours = async () => {
    setSaving(true);
    try {
      const arr = Array.from(hours).sort((a, b) => a - b);
      const { error } = await supabase
        .from("profiles")
        .update({ working_hours: arr } as any)
        .eq("id", trainerId);
      if (error) throw error;
      await logAudit({
        action: "trainer.working_hours_update",
        target_type: "user",
        target_id: trainerId,
        target_label: name,
        metadata: { working_hours: arr },
      });
      toast.success("Working hours updated");
      qc.invalidateQueries({ queryKey: ["trainer-profile", trainerId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const activeClients = clients.filter((c: any) => clientStatus(c.expiry_date) !== "expired").length;
  const totalOutstanding = clients.reduce(
    (s: number, c: any) => s + Math.max(0, Number(c.package_amount) - Number(c.amount_paid)),
    0,
  );

  // Build busy hours: clients' preferred_hour
  const busyByHour = new Map<number, number>();
  for (const c of clients as any[]) {
    if (clientStatus(c.expiry_date) === "expired") continue;
    const h = c.preferred_hour as number | null;
    if (h == null) continue;
    busyByHour.set(h, (busyByHour.get(h) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <Link
        to="/trainers-overview"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Trainers floor
      </Link>

      {/* Header card */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src={avatar}
            alt={name}
            className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-primary/30"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{name}</h1>
              {profile.level && (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {profile.level}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  profile.status === "inactive"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-success/40 bg-success/10 text-success"
                }
              >
                {profile.status ?? "active"}
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              {profile.email && (
                <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {profile.email}</span>
              )}
              {profile.phone && (
                <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {profile.phone}</span>
              )}
              {profile.specialization && (
                <span className="inline-flex items-center gap-2"><Award className="h-3.5 w-3.5" /> {profile.specialization}</span>
              )}
              {profile.address && (
                <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {profile.address}</span>
              )}
            </div>
            {profile.certifications && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold">Certifications:</span> {profile.certifications}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Assigned" value={clients.length} />
        <Stat icon={CalendarCheck} label="Active" value={activeClients} tone="success" />
        <Stat icon={Trophy} label={`Incentive · ${inc?.monthLabel ?? "—"}`} value={`₹${(inc?.incentive ?? 0).toLocaleString()}`} tone="primary" />
        <Stat icon={Clock} label="Outstanding" value={`₹${Math.round(totalOutstanding).toLocaleString()}`} tone={totalOutstanding > 0 ? "warning" : "muted"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Working hours editor */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Working hours
              </h2>
              <p className="text-xs text-muted-foreground">
                {canEditHours ? "Tap a slot to toggle availability." : "Read-only view."}
              </p>
            </div>
            {canEditHours && dirty && (
              <Button size="sm" onClick={saveHours} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Save
              </Button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-4">
            {TRAINING_HOURS.map((h) => {
              const on = hours.has(h);
              const busy = (busyByHour.get(h) ?? 0) > 0;
              return (
                <button
                  key={h}
                  type="button"
                  disabled={!canEditHours}
                  onClick={() => toggleHour(h)}
                  className={`group relative rounded-md border px-2 py-2 text-[11px] font-semibold transition ${
                    on
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  } ${!canEditHours ? "cursor-default opacity-80" : ""}`}
                  title={formatHourRange(h)}
                >
                  {formatHour(h)}
                  {busy && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-warning" title={`${busyByHour.get(h)} booked`} />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle" />
            dot = clients booked at that hour
          </p>
        </div>

        {/* Assigned clients */}
        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Assigned clients
            </h2>
            <span className="text-xs text-muted-foreground">{clients.length} total</span>
          </div>
          {clients.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/10 py-8 text-center text-xs text-muted-foreground">
              No clients assigned yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Client</th>
                    <th className="py-2 pr-3 font-medium">Package</th>
                    <th className="py-2 pr-3 font-medium">Slot</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c: any) => {
                    const bal = Math.max(0, Number(c.package_amount) - Number(c.amount_paid));
                    const s = clientStatus(c.expiry_date);
                    return (
                      <tr key={c.id} className="border-b border-border/30 last:border-0">
                        <td className="py-2 pr-3">
                          <Link
                            to="/clients/$id"
                            params={{ id: c.id }}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {c.name}
                          </Link>
                          {c.phone && (
                            <div className="text-[11px] text-muted-foreground">{c.phone}</div>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{c.package_name || "—"}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {c.preferred_hour != null ? formatHour(c.preferred_hour) : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant="outline"
                            className={
                              s === "active"
                                ? "border-success/40 bg-success/10 text-success"
                                : s === "expiring"
                                  ? "border-warning/40 bg-warning/10 text-warning"
                                  : "border-destructive/40 bg-destructive/10 text-destructive"
                            }
                          >
                            {s}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                          {bal > 0 ? <span className="text-warning">₹{bal.toLocaleString()}</span> : <span className="text-muted-foreground">₹0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone?: "success" | "warning" | "muted" | "primary";
}) {
  const color =
    tone === "success" ? "text-success"
      : tone === "warning" ? "text-warning"
      : tone === "muted" ? "text-muted-foreground"
      : "text-primary";
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
