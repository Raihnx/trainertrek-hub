import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monthRange, incentiveFor, clientStatus } from "./incentive";
import type { AppRole } from "./useRole";

export type StaffMember = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: "active" | "inactive";
  role: AppRole;
  created_at: string;
};

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async (): Promise<StaffMember[]> => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url, phone, status, created_at");
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;
      const roleMap = new Map<string, AppRole>();
      for (const r of (roles ?? []) as { user_id: string; role: AppRole }[]) {
        const existing = roleMap.get(r.user_id);
        // priority admin > receptionist > trainer
        const rank = (x: AppRole) => (x === "admin" ? 0 : x === "receptionist" ? 1 : 2);
        if (!existing || rank(r.role) < rank(existing)) roleMap.set(r.user_id, r.role);
      }
      return (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        phone: p.phone,
        status: (p.status ?? "active") as "active" | "inactive",
        role: roleMap.get(p.id) ?? "trainer",
        created_at: p.created_at,
      }));
    },
  });
}

export function useSetStaffStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      const { error } = await supabase.from("profiles").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useSetStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Replace all roles for this user with the new single role.
      const del = await (supabase as any).from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw del.error;
      const ins = await (supabase as any).from("user_roles").insert({ user_id: userId, role });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["user-role"] });
    },
  });
}

// -------- Admin-wide org metrics (cross-trainer) --------
export function useAdminOrgMetrics(monthISO: string) {
  return useQuery({
    queryKey: ["admin-org-metrics", monthISO],
    queryFn: async () => {
      const { start, end } = monthRange(monthISO);
      const [clientsRes, paymentsAllRes, paymentsMonthRes, attendanceRes, staffRes, rolesRes] =
        await Promise.all([
          supabase.from("clients").select("*"),
          supabase.from("payments").select("amount, paid_at, trainer_id"),
          supabase.from("payments").select("amount, paid_at, trainer_id")
            .gte("paid_at", start).lte("paid_at", end + "T23:59:59"),
          supabase.from("attendance").select("client_id, trainer_id, date, status")
            .gte("date", start).lte("date", end),
          supabase.from("profiles").select("id, status"),
          (supabase as any).from("user_roles").select("user_id, role"),
        ]);

      if (clientsRes.error) throw clientsRes.error;
      if (paymentsAllRes.error) throw paymentsAllRes.error;
      if (paymentsMonthRes.error) throw paymentsMonthRes.error;
      if (attendanceRes.error) throw attendanceRes.error;
      if (staffRes.error) throw staffRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const clients = clientsRes.data ?? [];
      const today = new Date().toISOString().slice(0, 10);
      const todayPayments = (paymentsAllRes.data ?? []).filter((p: any) => p.paid_at.slice(0, 10) === today);

      const totalClients = clients.length;
      let active = 0, expiring = 0, expired = 0;
      let outstanding = 0, totalPackageValue = 0, totalCollectedFromClients = 0;
      for (const c of clients as any[]) {
        const s = clientStatus(c.expiry_date);
        if (s === "active") active++;
        else if (s === "expiring") expiring++;
        else expired++;
        const bal = Number(c.package_amount) - Number(c.amount_paid);
        outstanding += Math.max(0, bal);
        totalPackageValue += Number(c.package_amount);
        totalCollectedFromClients += Number(c.amount_paid);
      }

      const revenueAll = (paymentsAllRes.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const revenueMonth = (paymentsMonthRes.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const revenueToday = todayPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);

      // incentives per trainer
      const presentDaysByTrainerClient = new Map<string, Map<string, number>>(); // trainer -> client -> days
      for (const a of (attendanceRes.data ?? []) as any[]) {
        if (a.status !== "present") continue;
        if (!presentDaysByTrainerClient.has(a.trainer_id)) presentDaysByTrainerClient.set(a.trainer_id, new Map());
        const m = presentDaysByTrainerClient.get(a.trainer_id)!;
        m.set(a.client_id, (m.get(a.client_id) ?? 0) + 1);
      }

      const revenueByTrainer = new Map<string, number>();
      for (const p of (paymentsMonthRes.data ?? []) as any[]) {
        revenueByTrainer.set(p.trainer_id, (revenueByTrainer.get(p.trainer_id) ?? 0) + Number(p.amount));
      }
      const clientsByTrainer = new Map<string, number>();
      for (const c of clients as any[]) {
        clientsByTrainer.set(c.trainer_id, (clientsByTrainer.get(c.trainer_id) ?? 0) + 1);
      }

      const roles = (rolesRes.data ?? []) as { user_id: string; role: AppRole }[];
      const trainerIds = new Set(roles.filter((r) => r.role === "trainer").map((r) => r.user_id));
      const receptionistIds = new Set(roles.filter((r) => r.role === "receptionist").map((r) => r.user_id));
      const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id));

      const staff = (staffRes.data ?? []) as { id: string; status: string }[];
      const activeStaff = staff.filter((s) => (s.status ?? "active") === "active").length;
      const inactiveStaff = staff.length - activeStaff;

      let monthlyIncentiveAll = 0;
      const trainerStats: Array<{
        trainer_id: string; clientCount: number; revenue: number; incentive: number;
      }> = [];
      const trainerIdsList = Array.from(new Set([
        ...Array.from(presentDaysByTrainerClient.keys()),
        ...Array.from(revenueByTrainer.keys()),
        ...Array.from(clientsByTrainer.keys()),
        ...Array.from(trainerIds),
      ]));
      for (const tid of trainerIdsList) {
        const m = presentDaysByTrainerClient.get(tid);
        let inc = 0;
        if (m) for (const [, d] of m) inc += incentiveFor(d);
        monthlyIncentiveAll += inc;
        trainerStats.push({
          trainer_id: tid,
          clientCount: clientsByTrainer.get(tid) ?? 0,
          revenue: revenueByTrainer.get(tid) ?? 0,
          incentive: Math.round(inc),
        });
      }

      // total incentive liability = cap of 2000 * clientCount across active month
      const totalIncentiveLiability = totalClients * 2000;

      return {
        totalClients, active, expiring, expired,
        revenueAll, revenueMonth, revenueToday,
        outstanding, totalCollectedFromClients, totalPackageValue,
        monthlyIncentiveAll: Math.round(monthlyIncentiveAll),
        totalIncentiveLiability,
        totalTrainers: trainerIds.size,
        totalReceptionists: receptionistIds.size,
        totalAdmins: adminIds.size,
        activeStaff, inactiveStaff,
        trainerStats: trainerStats.sort((a, b) => b.revenue - a.revenue),
      };
    },
  });
}
