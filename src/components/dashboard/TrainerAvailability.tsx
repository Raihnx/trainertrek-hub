import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Users, Phone, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAssignableTrainers } from "@/components/clients/AssignTrainerDialog";
import { useClients } from "@/lib/queries";
import { TRAINING_HOURS, formatHour } from "@/lib/time-slots";
import { useUserRole } from "@/lib/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export function TrainerAvailability() {
  const { data: trainers = [], isLoading } = useAssignableTrainers();
  const { data: clients = [] } = useClients();

  // Only trainers (exclude admin/receptionist) — they're the ones taking sessions
  const trainerOnly = useMemo(
    () => trainers.filter((t) => t.role === "trainer"),
    [trainers],
  );

  // Build busy map: trainer_id -> hour -> client list
  const busy = useMemo(() => {
    const m = new Map<string, Map<number, typeof clients>>();
    for (const c of clients) {
      if (c.status === "expired") continue;
      const h = (c as any).preferred_hour as number | null | undefined;
      if (h == null) continue;
      if (!m.has(c.trainer_id)) m.set(c.trainer_id, new Map());
      const inner = m.get(c.trainer_id)!;
      const arr = inner.get(h) ?? [];
      arr.push(c);
      inner.set(h, arr);
    }
    return m;
  }, [clients]);

  const [picked, setPicked] = useState<
    | { trainerName: string; hour: number; clients: typeof clients }
    | null
  >(null);
  const { data: role } = useUserRole();
  const canManageSlots = role === "admin" || role === "receptionist";
  const qc = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const freeSlot = async (clientId: string, clientName: string) => {
    setRemovingId(clientId);
    try {
      const { error } = await supabase.from("clients").update({ preferred_hour: null } as any).eq("id", clientId);
      if (error) throw error;
      await logAudit({
        action: "client.unassign_slot",
        target_type: "client",
        target_id: clientId,
        target_label: clientName,
        description: `Freed trainer slot for ${clientName}`,
      });
      toast.success(`Freed slot for ${clientName}`);
      qc.invalidateQueries({ queryKey: ["clients"] });
      setPicked((p) => (p ? { ...p, clients: p.clients.filter((c) => c.id !== clientId) } : p));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to free slot");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">Loading trainer availability…</p>
      </div>
    );
  }

  if (!trainerOnly.length) {
    return (
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold">Trainer availability</h3>
        <p className="mt-2 text-sm text-muted-foreground">No trainers yet.</p>
      </div>
    );
  }

  const totalSlots = TRAINING_HOURS.length;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Trainer free slots
          </h3>
          <p className="text-xs text-muted-foreground">
            Green = free · Amber/Red = busy (number = clients booked that hour)
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 text-[10px] text-muted-foreground sm:flex">
          <Legend color="bg-success/25 border-success/40" label="Free" />
          <Legend color="bg-warning/30 border-warning/50" label="1" />
          <Legend color="bg-destructive/30 border-destructive/50" label="2+" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-semibold text-muted-foreground">
                Trainer
              </th>
              {TRAINING_HOURS.map((h) => (
                <th
                  key={h}
                  className="px-1 py-2 text-center font-medium text-[10px] text-muted-foreground"
                  title={formatHour(h) + " – " + formatHour(h + 1)}
                >
                  {formatHour(h).replace(" ", "")}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Free</th>
            </tr>
          </thead>
          <tbody>
            {trainerOnly.map((t) => {
              const inner = busy.get(t.id) ?? new Map<number, typeof clients>();
              const busyCount = TRAINING_HOURS.filter((h) => (inner.get(h)?.length ?? 0) > 0).length;
              const freeCount = totalSlots - busyCount;
              const name = t.display_name || t.email || "Trainer";
              return (
                <tr key={t.id} className="group">
                  <td className="sticky left-0 z-10 bg-card px-2 py-1.5 align-middle">
                    <Link
                      to="/trainers/$trainerId"
                      params={{ trainerId: t.id }}
                      className="flex items-center gap-2 rounded-md -m-1 p-1 hover:bg-muted/30"
                      title="Open trainer profile"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold uppercase text-primary">
                        {name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium max-w-[120px] hover:text-primary">{name}</div>
                      </div>
                    </Link>
                  </td>
                  {TRAINING_HOURS.map((h) => {
                    const list = inner.get(h) ?? [];
                    const count = list.length;
                    const cls =
                      count === 0
                        ? "bg-success/15 border-success/30 text-success/80"
                        : count === 1
                          ? "bg-warning/25 border-warning/40 text-warning"
                          : "bg-destructive/30 border-destructive/50 text-destructive";
                    return (
                      <td key={h} className="px-0.5 py-0.5">
                        <button
                          type="button"
                          disabled={count === 0}
                          onClick={() => setPicked({ trainerName: name, hour: h, clients: list })}
                          title={`${name} · ${formatHour(h)}–${formatHour(h + 1)} · ${count === 0 ? "Free" : count + " booked"}`}
                          className={`flex h-7 w-full items-center justify-center rounded border text-[10px] font-semibold tabular-nums ${cls} ${count > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                        >
                          {count === 0 ? "" : count}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 font-semibold tabular-nums">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {freeCount}/{totalSlots}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!picked} onOpenChange={(v) => !v && setPicked(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {picked?.trainerName} · {picked && formatHour(picked.hour)}–{picked && formatHour(picked.hour + 1)}
            </DialogTitle>
            <DialogDescription>
              {picked?.clients.length} client{(picked?.clients.length ?? 0) === 1 ? "" : "s"} booked this hour
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {picked?.clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 hover:border-primary/40 hover:bg-muted/20"
              >
                <Link
                  to="/clients/$id"
                  params={{ id: c.id }}
                  onClick={() => setPicked(null)}
                  className="min-w-0 flex-1"
                >
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                    )}
                    {c.package_name && <span>· {c.package_name}</span>}
                  </div>
                </Link>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => freeSlot(c.id, c.name)}
                    disabled={removingId === c.id}
                    title="Free this slot (unassign client from this hour)"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
                  >
                    {removingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    Remove
                  </button>
                )}
              </div>
            ))}
            {picked && picked.clients.length === 0 && (
              <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                No clients in this slot.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded border ${color}`} />
      {label}
    </span>
  );
}
