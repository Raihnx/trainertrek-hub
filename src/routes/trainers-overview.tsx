import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Coffee, Clock, CheckCircle2, XCircle, Snowflake, Shield, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, useIsAdmin } from "@/lib/useRole";
import { useClients, type ClientWithDerived } from "@/lib/queries";
import { useAssignableTrainers } from "@/components/clients/AssignTrainerDialog";
import { TRAINING_HOURS, formatHourRange } from "@/lib/time-slots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { clientStatus } from "@/lib/incentive";

export const Route = createFileRoute("/trainers-overview")({
  head: () => ({
    meta: [
      { title: "Trainers overview — FitProHub" },
      { name: "description", content: "See every trainer, their daily sessions, free time and assign clients." },
    ],
  }),
  component: TrainersOverviewPage,
});

type TodayAttendance = { client_id: string; trainer_id: string; status: "present" | "absent" | "freeze" };

function useTodayAttendance() {
  return useQuery({
    queryKey: ["attendance-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance")
        .select("client_id, trainer_id, status")
        .eq("date", today);
      if (error) throw error;
      return (data ?? []) as TodayAttendance[];
    },
    refetchInterval: 30_000,
  });
}

function TrainersOverviewPage() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { isAdmin } = useIsAdmin();
  const allowed = isAdmin || role === "receptionist";

  const { data: trainers = [], isLoading: tLoading } = useAssignableTrainers();
  const { data: clients = [], isLoading: cLoading } = useClients();
  const { data: todayAtt = [] } = useTodayAttendance();

  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);

  const trainerColumns = useMemo(() => {
    return trainers
      .filter((t) => t.role === "trainer")
      .map((t) => {
        const assigned = clients.filter((c) => c.trainer_id === t.id);
        const activeAssigned = assigned.filter((c) => clientStatus(c.expiry_date) !== "expired");
        const todayMap = new Map<string, TodayAttendance["status"]>(
          todayAtt.filter((a) => a.trainer_id === t.id).map((a) => [a.client_id, a.status] as const),
        );
        const todaySessions = activeAssigned.map((c) => ({
          client: c,
          status: (todayMap.get(c.id) ?? "pending") as "present" | "absent" | "freeze" | "pending",
        }));
        const pending = todaySessions.filter((s) => s.status === "pending").length;
        const done = todaySessions.length - pending;
        return { trainer: t, assigned, todaySessions, pending, done };
      })
      .sort((a, b) => b.assigned.length - a.assigned.length);
  }, [trainers, clients, todayAtt]);

  if (roleLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!allowed) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">Restricted</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only reception and admins can view this page.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">← Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Floor view</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Trainers <span className="text-gradient-gold">overview</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See each trainer's daily sessions, availability and assign clients.
        </p>
      </div>

      {tLoading || cLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading trainers…</div>
      ) : trainerColumns.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No trainers yet. Add staff to get started.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {trainerColumns.map(({ trainer, assigned, todaySessions, pending, done }) => {
            const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.display_name || trainer.email || "T")}`;
            const free = pending === 0;
            return (
              <div
                key={trainer.id}
                className="glass flex w-[320px] shrink-0 flex-col rounded-2xl p-4"
              >
                {/* Header */}
                <div className="mb-3 flex items-center gap-3">
                  <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-primary/30" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-base font-semibold">
                      {trainer.display_name || trainer.email}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {trainer.role}
                    </div>
                  </div>
                  {free ? (
                    <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                      <Coffee className="mr-1 h-3 w-3" /> Free
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                      <Clock className="mr-1 h-3 w-3" /> Busy
                    </Badge>
                  )}
                </div>

                {/* KPIs */}
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <Mini label="Clients" value={assigned.length} icon={Users} />
                  <Mini label="Done" value={done} tone="success" icon={CheckCircle2} />
                  <Mini label="Pending" value={pending} tone={pending ? "warning" : "muted"} icon={Clock} />
                </div>

                {/* Today's sessions */}
                <div className="mb-3 flex-1 overflow-hidden">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Today's sessions
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{todaySessions.length}</span>
                  </div>
                  {todaySessions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-muted/10 py-6 text-center text-xs text-muted-foreground">
                      No active clients
                    </p>
                  ) : (
                    <ul className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
                      {todaySessions.map(({ client, status }) => (
                        <li
                          key={client.id}
                          className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/15 p-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{client.name}</div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {client.package_name || "—"}
                            </div>
                          </div>
                          <StatusPill status={status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Assign button */}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setAssignTarget({ id: trainer.id, name: trainer.display_name || trainer.email || "Trainer" })}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign clients
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AssignClientsToTrainerDialog
        target={assignTarget}
        clients={clients}
        onClose={() => setAssignTarget(null)}
      />
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "muted";
  icon: any;
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-primary";
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-2 text-center">
      <Icon className={`mx-auto h-3.5 w-3.5 ${color}`} />
      <div className="mt-0.5 font-display text-sm font-semibold">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "present" | "absent" | "freeze" | "pending" }) {
  if (status === "present")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" /> P
      </span>
    );
  if (status === "absent")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
        <XCircle className="h-3 w-3" /> A
      </span>
    );
  if (status === "freeze")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
        <Snowflake className="h-3 w-3" /> F
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
      <Clock className="h-3 w-3" /> —
    </span>
  );
}

function AssignClientsToTrainerDialog({
  target,
  clients,
  onClose,
}: {
  target: { id: string; name: string } | null;
  clients: ClientWithDerived[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    if (!target) return [];
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => c.trainer_id !== target.id)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))
      .slice(0, 200);
  }, [clients, target, query]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const close = () => {
    if (saving) return;
    setSelected(new Set());
    setQuery("");
    onClose();
  };

  const submit = async () => {
    if (!target || selected.size === 0) return;
    setSaving(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("clients")
        .update({ trainer_id: target.id })
        .in("id", ids);
      if (error) throw error;
      await logAudit({
        action: "client.assign_trainer",
        target_type: "user",
        target_id: target.id,
        target_label: target.name,
        description: `Assigned ${ids.length} client(s) to ${target.name}`,
        metadata: { trainer_id: target.id, client_ids: ids },
      });
      toast.success(`Assigned ${ids.length} client(s) to ${target.name}`);
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      setSelected(new Set());
      setQuery("");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Assign clients to {target?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search by name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-[380px] overflow-y-auto rounded-lg border border-border/60 bg-muted/10">
            {candidates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No matching clients</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {candidates.map((c) => {
                  const checked = selected.has(c.id);
                  return (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-3 p-2.5 hover:bg-muted/30">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(c.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{c.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {c.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {c.phone}
                              </span>
                            )}
                            <span>· {c.package_name || "—"}</span>
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.size} selected
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || selected.size === 0}>
            {saving ? "Assigning…" : `Assign ${selected.size || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
