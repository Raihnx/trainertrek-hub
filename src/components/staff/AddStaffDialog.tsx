import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createStaff } from "@/lib/staff.functions";
import { logAudit } from "@/lib/audit";
import type { AppRole } from "@/lib/useRole";

export function AddStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(createStaff);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("trainer");
  const [show, setShow] = useState(false);

  const reset = () => {
    setEmail(""); setPassword(""); setDisplayName(""); setRole("trainer"); setShow(false);
  };

  const mutation = useMutation({
    mutationFn: async () => fn({ data: { email: email.trim(), password, displayName: displayName.trim(), role } }),
    onSuccess: async (res) => {
      toast.success(`${displayName} added as ${role}`);
      await logAudit({ action: "staff.create", target_id: res.userId, target_label: displayName, metadata: { email, role } });
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["admin-org-metrics"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create staff"),
  });

  const canSubmit =
    email.includes("@") && password.length >= 8 && displayName.length >= 1 && !mutation.isPending;

  const generate = () => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let p = "";
    for (let i = 0; i < 14; i++) p += charset[Math.floor(Math.random() * charset.length)];
    setPassword(p);
    setShow(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Add staff member</DialogTitle>
          <DialogDescription>Create an account with email & password. Share the credentials with the staff member to sign in.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ds-name">Full name</Label>
            <Input id="ds-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Priya Sharma" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-email">Email</Label>
            <Input id="ds-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@forgefit.in" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-password">Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ds-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" onClick={generate}>Generate</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Share this password securely. They can change it after first sign-in.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Position</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trainer">Trainer</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="admin">Admin (max 2)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
