import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset"
  | "staff.role_change"
  | "staff.status_change"
  | "staff.permission_set"
  | "staff.permission_reset"
  | "staff.create"
  | "staff.update"
  | "staff.delete"
  | "client.create"
  | "client.update"
  | "client.delete"
  | "client.renewal"
  | "membership.update"
  | "membership.package_change"
  | "membership.freeze"
  | "membership.unfreeze"
  | "attendance.marked"
  | "attendance.edited"
  | "payment.add"
  | "payment.update"
  | "payment.delete"
  | "settings.update";

export type AuditEntry = {
  id: string;
  actor_id: string;
  actor_email: string | null;
  actor_role: string | null;
  actor_name: string | null;
  action: AuditAction | string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

let _cachedActor: { id: string; email: string | null; name: string | null; role: string | null } | null = null;

async function resolveActor() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (_cachedActor && _cachedActor.id === user.id) return _cachedActor;
  // fetch profile + role (best-effort)
  const [{ data: prof }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    (supabase as any).from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const roles: string[] = (roleRows ?? []).map((r: { role: string }) => r.role);
  const role = roles.includes("admin") ? "admin" : roles.includes("receptionist") ? "receptionist" : roles.includes("trainer") ? "trainer" : null;
  _cachedActor = {
    id: user.id,
    email: user.email ?? null,
    name: (prof as any)?.display_name ?? user.email?.split("@")[0] ?? null,
    role,
  };
  return _cachedActor;
}

/** Best-effort audit log writer. Never throws. */
export async function logAudit(input: {
  action: AuditAction | string;
  target_type?: string;
  target_id?: string;
  target_label?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const actor = await resolveActor();
    if (!actor) return;
    // Write via SECURITY DEFINER RPC so the server stamps the actor
    // identity — direct INSERT into admin_audit_log is no longer allowed.
    await (supabase as any).rpc("log_audit_event", {
      _action: input.action,
      _target_type: input.target_type ?? null,
      _target_id: input.target_id ?? null,
      _target_label: input.target_label ?? null,
      _description: input.description ?? null,
      _metadata: input.metadata ?? {},
    });
  } catch (e) {
    console.warn("[audit] failed to log", e);
  }
}

export function clearAuditActorCache() {
  _cachedActor = null;
}

export function useAuditLog(limit = 500) {
  return useQuery({
    queryKey: ["audit-log", limit],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await (supabase as any)
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
  });
}
