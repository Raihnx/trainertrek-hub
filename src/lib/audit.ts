import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "staff.role_change"
  | "staff.status_change"
  | "staff.permission_set"
  | "staff.permission_reset"
  | "client.delete"
  | "payment.delete"
  | "settings.update";

export type AuditEntry = {
  id: string;
  actor_id: string;
  actor_email: string | null;
  action: AuditAction | string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/**
 * Best-effort audit log writer. Never throws — failure to log must not break
 * the underlying admin action.
 */
export async function logAudit(input: {
  action: AuditAction | string;
  target_type?: string;
  target_id?: string;
  target_label?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("admin_audit_log").insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action: input.action,
      target_type: input.target_type ?? null,
      target_id: input.target_id ?? null,
      target_label: input.target_label ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (e) {
    // swallow — audit must not block UX
    console.warn("[audit] failed to log", e);
  }
}

export function useAuditLog(limit = 200) {
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
