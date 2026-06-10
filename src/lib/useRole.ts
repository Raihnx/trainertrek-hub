import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "receptionist" | "trainer";

export function useUserRole() {
  return useQuery({
    queryKey: ["user-role"],
    queryFn: async (): Promise<AppRole | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      const roles = (data ?? []).map((r: { role: AppRole }) => r.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("receptionist")) return "receptionist";
      if (roles.includes("trainer")) return "trainer";
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useIsAdmin() {
  const { data: role, isLoading } = useUserRole();
  return { isAdmin: role === "admin", isLoading };
}

/**
 * Primary admin = the first-created admin user. Only the primary admin can
 * create/edit/delete data. A secondary admin has full read access but is
 * read-only.
 */
export function useIsPrimaryAdmin() {
  const { data: role } = useUserRole();
  const query = useQuery({
    queryKey: ["is-primary-admin"],
    enabled: role === "admin",
    queryFn: async (): Promise<boolean> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await (supabase as any)
        .rpc("is_primary_admin", { _user_id: user.id });
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  });
  return {
    isPrimaryAdmin: role === "admin" && query.data === true,
    isSecondaryAdmin: role === "admin" && query.data === false,
    isLoading: query.isLoading,
  };
}

/**
 * Returns true when the current user is allowed to write data.
 * Admin (primary), receptionist, and trainer can write; secondary admin cannot.
 */
export function useCanWrite() {
  const { data: role } = useUserRole();
  const { isSecondaryAdmin, isLoading } = useIsPrimaryAdmin();
  if (role === "admin") return { canWrite: !isSecondaryAdmin, isLoading };
  return { canWrite: role === "receptionist" || role === "trainer", isLoading: false };
}
