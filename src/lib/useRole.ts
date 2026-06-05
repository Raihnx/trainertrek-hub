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
