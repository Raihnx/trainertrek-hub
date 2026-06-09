import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useAddClient } from "@/lib/queries";
import { toast } from "sonner";
import { eligibleDaysFor } from "@/lib/incentive";
import { uploadAvatar } from "@/lib/upload";
import { TRAINING_HOURS, formatHourRange } from "@/lib/time-slots";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const add = useAddClient();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    photo_url: "",
    package_name: "",
    package_amount: 0,
    amount_paid: 0,
    total_days: 30,
    joining_date: new Date().toISOString().slice(0, 10),
    client_type: "PT" as "PT" | "GT",
    preferred_hour: null as number | null,
  });

  const balance = form.package_amount - form.amount_paid;
  const eligible = eligibleDaysFor(form.total_days, form.amount_paid, form.package_amount);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.package_name) {
      toast.error("Name and package are required");
      return;
    }
    add.mutate(
      { ...form, eligible_days: eligible },
      {
        onSuccess: () => {
          toast.success("Client added");
          setOpen(false);
          setForm({ name: "", phone: "", photo_url: "", package_name: "", package_amount: 0, amount_paid: 0, total_days: 30, joining_date: new Date().toISOString().slice(0, 10), client_type: "PT" });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95">
          <Plus className="h-4 w-4" /> Add client
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Joining date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Client type *</Label>
              <div className="mt-1 inline-flex rounded-lg border border-border bg-muted/30 p-1">
                {(["PT", "GT"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("client_type", t)}
                    className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${form.client_type === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t === "PT" ? "Personal Training (PT)" : "General Training (GT)"}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Package *</Label>
              <Input placeholder="e.g. Elite — 6 months" value={form.package_name} onChange={(e) => set("package_name", e.target.value)} required />
            </div>
            <div>
              <Label>Total payment (₹)</Label>
              <Input type="number" min={0} value={form.package_amount} onChange={(e) => set("package_amount", Number(e.target.value))} />
            </div>
            <div>
              <Label>Paid amount (₹)</Label>
              <Input type="number" min={0} value={form.amount_paid} onChange={(e) => set("amount_paid", Number(e.target.value))} />
            </div>
            <div>
              <Label>Total days</Label>
              <Input type="number" min={1} value={form.total_days} onChange={(e) => set("total_days", Number(e.target.value))} />
            </div>
            <div>
              <Label>Eligible days</Label>
              <Input value={eligible} readOnly className="bg-muted/30" />
            </div>
            <div className="col-span-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-2">
                <Input placeholder="https://… or upload" value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} />
                <Input
                  type="file"
                  accept="image/*"
                  className="max-w-[180px]"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const url = await uploadAvatar(f, "clients");
                      set("photo_url", url);
                      toast.success("Photo uploaded");
                    } catch (err: any) {
                      toast.error(err.message ?? "Upload failed");
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Balance: <span className={`font-semibold ${balance > 0 ? "text-warning" : "text-success"}`}>₹{balance.toLocaleString("en-IN")}</span>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
