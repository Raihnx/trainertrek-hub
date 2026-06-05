import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Shield, UserX, UserCheck, Loader2, Trophy, Wallet, KeyRound } from "lucide-react";
import { useIsAdmin } from "@/lib/useRole";
import { useStaff, useSetStaffStatus, useSetStaffRole, useAdminOrgMetrics } from "@/lib/admin-queries";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/app-store";
import { toast } from "sonner";
import type { AppRole } from "@/lib/useRole";
import { PermissionMatrixDialog } from "@/components/staff/PermissionMatrixDialog";


export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff — ForgeFit" }, { name: "description", content: "Manage trainers and receptionists." }] }),
  component: StaffPage,
});

function StaffPage() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const month = useAppStore((s) => s.month);
  const { data: staff = [], isLoading } = useStaff();
  const { data: org } = useAdminOrgMetrics(month);
  const setStatus = useSetStaffStatus();
  const setRole = useSetStaffRole();

  const [pending, setPending] = useState<string | null>(null);
  const [permTarget, setPermTarget] = useState<{ id: string; name: string; role: AppRole } | null>(null);


  if (roleLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">Admins only</h2>
        <p className="mt-1 text-sm text-muted-foreground">You don't have access to staff management.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">← Back to dashboard</Link>
      </div>
    );
  }

  const revenueByTrainer = new Map((org?.trainerStats ?? []).map((t) => [t.trainer_id, t]));

  const trainers = staff.filter((s) => s.role === "trainer");
  const receptionists = staff.filter((s) => s.role === "receptionist");
  const admins = staff.filter((s) => s.role === "admin");

  const handleRole = async (id: string, role: AppRole) => {
    setPending(id);
    try {
      await setRole.mutateAsync({ userId: id, role });
      toast.success("Role updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    } finally { setPending(null); }
  };

  const handleStatus = async (id: string, status: "active" | "inactive") => {
    setPending(id);
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(status === "active" ? "Account enabled" : "Account disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setPending(null); }
  };

  const Section = ({ title, list, showRevenue }: { title: string; list: typeof staff; showRevenue?: boolean }) => (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{list.length} member{list.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet. Invite people by asking them to sign up — they'll appear here, then assign them a role.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 font-medium">Name</th>
                <th className="py-2.5 font-medium">Email</th>
                {showRevenue && <th className="py-2.5 font-medium">Clients</th>}
                {showRevenue && <th className="py-2.5 font-medium">Revenue ({month})</th>}
                {showRevenue && <th className="py-2.5 font-medium">Incentive</th>}
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium">Role</th>
                <th className="py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const stat = revenueByTrainer.get(s.id);
                const photo = s.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.display_name ?? s.email ?? "U")}`;
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img src={photo} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/30" />
                        <span className="font-medium">{s.display_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{s.email ?? "—"}</td>
                    {showRevenue && <td className="py-3">{stat?.clientCount ?? 0}</td>}
                    {showRevenue && <td className="py-3">₹{(stat?.revenue ?? 0).toLocaleString("en-IN")}</td>}
                    {showRevenue && <td className="py-3 text-primary">₹{(stat?.incentive ?? 0).toLocaleString("en-IN")}</td>}
                    <td className="py-3">
                      {s.status === "active"
                        ? <Badge variant="outline" className="border-success/40 text-success">Active</Badge>
                        : <Badge variant="outline" className="border-destructive/40 text-destructive">Disabled</Badge>}
                    </td>
                    <td className="py-3">
                      <Select value={s.role} onValueChange={(v) => handleRole(s.id, v as AppRole)} disabled={pending === s.id}>
                        <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="receptionist">Receptionist</SelectItem>
                          <SelectItem value="trainer">Trainer</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPermTarget({ id: s.id, name: s.display_name ?? s.email ?? "Staff", role: s.role })}
                        >
                          <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Permissions
                        </Button>
                        {pending === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : s.status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => handleStatus(s.id, "inactive")}>
                            <UserX className="mr-1.5 h-3.5 w-3.5" /> Disable
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleStatus(s.id, "active")}>
                            <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Enable
                          </Button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Organization</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Staff <span className="text-gradient-gold">management</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Trainers, receptionists and admins across your gym.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Users} label="Trainers" value={String(org?.totalTrainers ?? trainers.length)} />
        <Kpi icon={Users} label="Receptionists" value={String(org?.totalReceptionists ?? receptionists.length)} />
        <Kpi icon={Wallet} label="Revenue (month)" value={`₹${(org?.revenueMonth ?? 0).toLocaleString("en-IN")}`} />
        <Kpi icon={Trophy} label="Incentive liability" value={`₹${(org?.monthlyIncentiveAll ?? 0).toLocaleString("en-IN")}`} />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading staff…</div>
      ) : (
        <>
          <Section title="Trainers" list={trainers} showRevenue />
          <Section title="Receptionists" list={receptionists} />
          <Section title="Admins" list={admins} />
        </>
      )}

      <PermissionMatrixDialog
        open={!!permTarget}
        onOpenChange={(o) => { if (!o) setPermTarget(null); }}
        userId={permTarget?.id ?? null}
        userName={permTarget?.name ?? ""}
        role={permTarget?.role ?? "trainer"}
      />
    </div>
  );
}


function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-1.5 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
