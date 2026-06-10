import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shield, ScrollText, Search, RotateCcw } from "lucide-react";
import { useIsAdmin } from "@/lib/useRole";
import { useAuditLog, type AuditEntry } from "@/lib/audit";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — ZAK's GYM" },
      { name: "description", content: "Trail of admin actions across the gym." },
    ],
  }),
  component: AuditPage,
});

const actionMeta: Record<string, { label: string; tone: string }> = {
  "auth.login": { label: "Sign in", tone: "border-success/40 text-success" },
  "auth.logout": { label: "Sign out", tone: "border-muted-foreground/40 text-muted-foreground" },
  "auth.password_reset": { label: "Password reset", tone: "border-warning/40 text-warning" },
  "staff.role_change": { label: "Role change", tone: "border-info/40 text-info" },
  "staff.status_change": { label: "Status change", tone: "border-warning/40 text-warning" },
  "staff.permission_set": { label: "Permission set", tone: "border-primary/40 text-primary" },
  "staff.permission_reset": { label: "Permission reset", tone: "border-muted-foreground/40 text-muted-foreground" },
  "staff.create": { label: "Staff created", tone: "border-success/40 text-success" },
  "staff.update": { label: "Staff updated", tone: "border-info/40 text-info" },
  "staff.delete": { label: "Staff deleted", tone: "border-destructive/40 text-destructive" },
  "client.create": { label: "Client created", tone: "border-success/40 text-success" },
  "client.update": { label: "Client updated", tone: "border-info/40 text-info" },
  "client.delete": { label: "Client deleted", tone: "border-destructive/40 text-destructive" },
  "client.renewal": { label: "Membership renewed", tone: "border-success/40 text-success" },
  "membership.update": { label: "Membership updated", tone: "border-info/40 text-info" },
  "membership.package_change": { label: "Package changed", tone: "border-info/40 text-info" },
  "membership.freeze": { label: "Membership frozen", tone: "border-warning/40 text-warning" },
  "membership.unfreeze": { label: "Membership resumed", tone: "border-success/40 text-success" },
  "attendance.marked": { label: "Attendance marked", tone: "border-primary/40 text-primary" },
  "attendance.edited": { label: "Attendance edited", tone: "border-info/40 text-info" },
  "payment.add": { label: "Payment added", tone: "border-success/40 text-success" },
  "payment.update": { label: "Payment updated", tone: "border-info/40 text-info" },
  "payment.delete": { label: "Payment deleted", tone: "border-destructive/40 text-destructive" },
};

function describe(e: AuditEntry): string {
  if (e.description) return e.description;
  const m = e.metadata ?? {};
  switch (e.action) {
    case "staff.role_change":
      return `Set role to ${(m as any).role}`;
    case "staff.status_change":
      return `${(m as any).status === "active" ? "Enabled" : "Disabled"} account`;
    case "staff.permission_set":
      return `${(m as any).granted ? "Granted" : "Revoked"} ${(m as any).permission}`;
    case "staff.permission_reset":
      return `Reset ${(m as any).permission} to role default`;
    default:
      return e.action;
  }
}

function AuditPage() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: entries = [], isLoading } = useAuditLog(500);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter(
      (e) =>
        (e.actor_email ?? "").toLowerCase().includes(s) ||
        (e.target_label ?? "").toLowerCase().includes(s) ||
        e.action.toLowerCase().includes(s) ||
        describe(e).toLowerCase().includes(s),
    );
  }, [entries, q]);

  if (roleLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">Admins only</h2>
        <p className="mt-1 text-sm text-muted-foreground">The audit log is restricted to admins.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Audit</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Activity <span className="text-gradient-gold">trail</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every admin action — role changes, account toggles and permission overrides.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search actor, target or action…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading audit log…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <ScrollText className="h-8 w-8 text-muted-foreground/60" />
            {entries.length === 0
              ? "No admin actions recorded yet."
              : (
                <>
                  <span>No entries match your search.</span>
                  <button onClick={() => setQ("")} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                </>
              )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 font-medium">When</th>
                  <th className="py-2.5 font-medium">Actor</th>
                  <th className="py-2.5 font-medium">Action</th>
                  <th className="py-2.5 font-medium">Target</th>
                  <th className="py-2.5 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const meta = actionMeta[e.action];
                  const when = new Date(e.created_at);
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 pr-4 align-top">
                        <div className="text-xs font-medium">{when.toLocaleDateString()}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="text-xs font-medium">{e.actor_name ?? e.actor_email ?? e.actor_id.slice(0, 8)}</div>
                        {e.actor_role && <div className="text-[11px] capitalize text-muted-foreground">{e.actor_role}</div>}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {meta ? (
                          <Badge variant="outline" className={meta.tone}>{meta.label}</Badge>
                        ) : (
                          <Badge variant="outline">{e.action}</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top">{e.target_label ?? e.target_id ?? "—"}</td>
                      <td className="py-3 align-top">{describe(e)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
