import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PersistedNotification = {
  id: string;
  trainer_id: string;
  client_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

const KEY = ["notifications"] as const;

export function useNotifications() {
  return useQuery<PersistedNotification[]>({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PersistedNotification[];
    },
  });
}

export function useUnreadCount() {
  const { data = [] } = useNotifications();
  return data.filter((n) => !n.read).length;
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast.error(e.message ?? "Failed to mark read"),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("trainer_id", uid)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("All notifications marked as read");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });
}
