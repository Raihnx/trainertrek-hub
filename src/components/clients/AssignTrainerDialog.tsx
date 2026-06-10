import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, UserCog, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { useCan } from "@/lib/permissions";
import type { ClientWithDerived } from "@/lib/queries";

type Trainer = { id: string; display_name: string | null; email: string | null; role: string };

export function useAssignableTrainers() {
  return useQuery({
    queryKey: ["assignable-trainers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_assignable_trainers");
      if (error) throw error;
      return ((data ?? []) as Trainer[]);
    },
  });
}

export function AssignTrainerDialog({
  client,
  open,
  onOpenChange,
}: {
  client: ClientWithDerived | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: trainers = [], isLoading } = useAssignableTrainers();
  const { allowed: canAssign } = useCan("trainers.assign");
  const [trainerId, setTrainerId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) setTrainerId(client.trainer_id);
  }, [client]);

  if (!client) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerId) return;
    if (trainerId === client.trainer_id) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("clients").update({ trainer_id: trainerId }).eq("id", client.id);
      if (error) throw error;
      const t = trainers.find((x) => x.id === trainerId);
      await logAudit({
        action: "client.assign_trainer",
        target_type: "client",
        target_id: client.id,
        target_label: client.name,
        description: `Reassigned ${client.name} to ${t?.display_name ?? t?.email ?? trainerId}`,
        metadata: { trainer_id: trainerId },
      });
      toast.success("Trainer assigned");
      qc.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" /> Assign trainer — {client.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Trainer</Label>
            {isLoading ? (
              <div className="py-3 text-sm text-muted-foreground">Loading trainers…</div>
            ) : (
              <select
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm outline-none focus:border-primary/50"
                required
              >
                <option value="">Select trainer…</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name || t.email} ({t.role})
                  </option>
                ))}
              </select>
            )}
          </div>
          {!canAssign && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 p-2 text-xs text-warning">
              <Lock className="h-3.5 w-3.5" /> You don't have permission to reassign trainers.
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !trainerId || !canAssign}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
