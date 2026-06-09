import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { logAudit } from "@/lib/audit";
import { eligibleDaysFor } from "@/lib/incentive";
import { toast } from "sonner";
import type { ClientWithDerived } from "@/lib/queries";

export function RenewClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: ClientWithDerived | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    package_name: "",
    package_amount: 0,
    amount_paid: 0,
    total_days: 30,
    joining_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        package_name: client.package_name ?? "",
        package_amount: Number(client.package_amount),
        amount_paid: 0,
        total_days: client.total_days || 30,
        joining_date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [client]);

  if (!client) return null;

  const eligible = eligibleDaysFor(form.total_days, form.amount_paid, form.package_amount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.package_name || form.total_days <= 0) {
      toast.error("Package and duration required");
      return;
    }
    setSaving(true);
    try {
      const joining = new Date(form.joining_date);
      const expiry = new Date(joining);
      expiry.setDate(expiry.getDate() + form.total_days);

      const { error } = await supabase
        .from("clients")
        .update({
          package_name: form.package_name,
          package_amount: form.package_amount,
          amount_paid: form.amount_paid,
          total_days: form.total_days,
          eligible_days: eligible,
          joining_date: form.joining_date,
          expiry_date: expiry.toISOString().slice(0, 10),
          freeze_days: 0,
        })
        .eq("id", client.id);
      if (error) throw error;

      if (form.amount_paid > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("payments").insert({
          trainer_id: user?.id ?? client.trainer_id,
          client_id: client.id,
          amount: form.amount_paid,
          note: `Renewal payment — ${form.package_name}`,
        });
      }

      await logAudit({
        action: "client.renew",
        target_type: "client",
        target_id: client.id,
        target_label: client.name,
        description: `Renewed ${client.name} on ${form.package_name} for ${form.total_days} days`,
        metadata: { package: form.package_name, total_days: form.total_days, amount_paid: form.amount_paid },
      });

      toast.success("Membership renewed");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["admin-org-metrics"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Renewal failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> Renew {client.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Package *</Label>
              <Input value={form.package_name} onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))} required />
            </div>
            <div>
              <Label>New start date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))} />
            </div>
            <div>
              <Label>Total days</Label>
              <Input type="number" min={1} value={form.total_days} onChange={(e) => setForm((f) => ({ ...f, total_days: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Package amount (₹)</Label>
              <Input type="number" min={0} value={form.package_amount} onChange={(e) => setForm((f) => ({ ...f, package_amount: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Paid now (₹)</Label>
              <Input type="number" min={0} value={form.amount_paid} onChange={(e) => setForm((f) => ({ ...f, amount_paid: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Eligible days</Label>
              <Input value={eligible} readOnly className="bg-muted/30" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Renew
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
