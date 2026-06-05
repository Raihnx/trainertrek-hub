import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./useRole";

export type Permission = {
  key: string;
  label: string;
  description: string | null;
  category: string;
};

export type UserPermissionOverride = {
  user_id: string;
  permission_key: string;
  granted: boolean;
};

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await (supabase as any)
        .from("permissions")
        .select("*")
        .order("category", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async (): Promise<Record<AppRole, Set<string>>> => {
      const { data, error } = await (supabase as any)
        .from("role_permissions")
        .select("role, permission_key");
      if (error) throw error;
      const out: Record<AppRole, Set<string>> = {
        admin: new Set(),
        receptionist: new Set(),
        trainer: new Set(),
      };
      (data ?? []).forEach((r: { role: AppRole; permission_key: string }) => {
        out[r.role]?.add(r.permission_key);
      });
      return out;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserPermissionOverrides(userId: string | null) {
  return useQuery({
    queryKey: ["user-permissions", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Map<string, boolean>> => {
      const { data, error } = await (supabase as any)
        .from("user_permissions")
        .select("permission_key, granted")
        .eq("user_id", userId);
      if (error) throw error;
      const m = new Map<string, boolean>();
      (data ?? []).forEach((r: { permission_key: string; granted: boolean }) => {
        m.set(r.permission_key, r.granted);
      });
      return m;
    },
  });
}

export function useSetUserPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      key: string;
      // null = clear override (fall back to role default)
      granted: boolean | null;
      userLabel?: string;
    }) => {
      const { logAudit } = await import("./audit");
      if (input.granted === null) {
        const { error } = await (supabase as any)
          .from("user_permissions")
          .delete()
          .eq("user_id", input.userId)
          .eq("permission_key", input.key);
        if (error) throw error;
        await logAudit({
          action: "staff.permission_reset",
          target_type: "user",
          target_id: input.userId,
          target_label: input.userLabel,
          metadata: { permission: input.key },
        });
        return;
      }
      const { error } = await (supabase as any)
        .from("user_permissions")
        .upsert(
          { user_id: input.userId, permission_key: input.key, granted: input.granted },
          { onConflict: "user_id,permission_key" },
        );
      if (error) throw error;
      await logAudit({
        action: "staff.permission_set",
        target_type: "user",
        target_id: input.userId,
        target_label: input.userLabel,
        metadata: { permission: input.key, granted: input.granted },
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["user-permissions", v.userId] });
      qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
  });
}

/**
 * Effective permissions for the currently signed-in user.
 * Admins are auto-granted everything.
 */
export function useMyPermissions() {
  return useQuery({
    queryKey: ["my-permissions"],
    queryFn: async (): Promise<Set<string>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Set();

      const [rolesRes, permsRes, rolePermsRes, overridesRes] = await Promise.all([
        (supabase as any).from("user_roles").select("role").eq("user_id", user.id),
        (supabase as any).from("permissions").select("key"),
        (supabase as any).from("role_permissions").select("role, permission_key"),
        (supabase as any).from("user_permissions").select("permission_key, granted").eq("user_id", user.id),
      ]);

      const roles = new Set<AppRole>(((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role));

      // Admin = everything
      if (roles.has("admin")) {
        return new Set<string>(((permsRes.data ?? []) as { key: string }[]).map((p) => p.key));
      }

      const allowed = new Set<string>();
      ((rolePermsRes.data ?? []) as { role: AppRole; permission_key: string }[]).forEach((rp) => {
        if (roles.has(rp.role)) allowed.add(rp.permission_key);
      });
      ((overridesRes.data ?? []) as { permission_key: string; granted: boolean }[]).forEach((o) => {
        if (o.granted) allowed.add(o.permission_key);
        else allowed.delete(o.permission_key);
      });
      return allowed;
    },
    staleTime: 60 * 1000,
  });
}

export function useCan(key: string) {
  const { data, isLoading } = useMyPermissions();
  return { allowed: data?.has(key) ?? false, isLoading };
}
