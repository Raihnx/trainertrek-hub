import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { monthRange, incentiveFor, clientStatus, daysLeft } from "./incentive";
import { logAudit } from "./audit";

export type ClientType = "GT" | "PT";
export type Client = Database["public"]["Tables"]["clients"]["Row"] & { client_type?: ClientType };
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Package = Database["public"]["Tables"]["packages"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ClientWithDerived = Client & {
  status: "active" | "expiring" | "expired";
  days_left: number;
  balance: number;
  paid_pct: number;
};

function decorate(c: Client): ClientWithDerived {
  return {
    ...c,
    status: clientStatus(c.expiry_date),
    days_left: daysLeft(c.expiry_date),
    balance: Number(c.package_amount) - Number(c.amount_paid),
    paid_pct: Number(c.package_amount) > 0 ? (Number(c.amount_paid) / Number(c.package_amount)) * 100 : 0,
  };
}

// -------- Profile --------
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return (data ?? { id: user.id, email: user.email ?? "", display_name: user.email?.split("@")[0] ?? "Trainer" }) as Profile;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// -------- Clients --------
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(decorate);
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? decorate(data) : null;
    },
    enabled: !!id,
  });
}

export function useAddClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      phone?: string;
      photo_url?: string;
      package_name: string;
      package_amount: number;
      amount_paid: number;
      total_days: number;
      eligible_days: number;
      joining_date: string;
      client_type?: ClientType;
      preferred_hour?: number | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const joining = new Date(input.joining_date);
      const expiry = new Date(joining);
      expiry.setDate(expiry.getDate() + input.total_days);
      const { data: inserted, error } = await supabase.from("clients").insert({
        trainer_id: user.id,
        name: input.name,
        phone: input.phone ?? null,
        photo_url: input.photo_url ?? null,
        package_name: input.package_name,
        package_amount: input.package_amount,
        amount_paid: input.amount_paid,
        total_days: input.total_days,
        eligible_days: input.eligible_days,
        joining_date: input.joining_date,
        expiry_date: expiry.toISOString().slice(0, 10),
        client_type: input.client_type ?? "PT",
        preferred_hour: input.preferred_hour ?? null,
      } as any).select("id").maybeSingle();
      if (error) throw error;
      await logAudit({
        action: "client.create",
        target_type: "client",
        target_id: (inserted as any)?.id,
        target_label: input.name,
        description: `Created ${input.client_type ?? "PT"} client ${input.name} on ${input.package_name}`,
        metadata: { client_type: input.client_type ?? "PT", package: input.package_name, amount_paid: input.amount_paid },
      });
      if (input.amount_paid > 0 && (inserted as any)?.id) {
        await supabase.from("payments").insert({
          trainer_id: user.id,
          client_id: (inserted as any).id,
          amount: input.amount_paid,
          note: "Initial payment on signup",
        });
        await logAudit({
          action: "payment.add",
          target_type: "client",
          target_id: (inserted as any).id,
          target_label: input.name,
          description: `Recorded initial payment ₹${input.amount_paid.toLocaleString("en-IN")} for ${input.name}`,
          metadata: { amount: input.amount_paid },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["admin-org-metrics"] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      await logAudit({
        action: "client.delete",
        target_type: "client",
        target_id: id,
        target_label: name,
        description: `Deleted client ${name ?? id}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["admin-org-metrics"] });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, label, description, action }: { id: string; patch: Partial<Client>; label?: string; description?: string; action?: string }) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      if (error) throw error;
      // If payment changed, also write a payments row + audit
      const paidDelta = (patch as any).__paid_delta as number | undefined;
      if (paidDelta && paidDelta > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("payments").insert({
            trainer_id: user.id, client_id: id, amount: paidDelta, note: "Manual payment",
          });
          await logAudit({
            action: "payment.add", target_type: "client", target_id: id, target_label: label,
            description: `Recorded payment ₹${paidDelta.toLocaleString("en-IN")} for ${label ?? id}`,
            metadata: { amount: paidDelta },
          });
        }
      }
      await logAudit({
        action: action ?? "client.update",
        target_type: "client",
        target_id: id,
        target_label: label,
        description: description ?? `Updated client ${label ?? id}`,
        metadata: { keys: Object.keys(patch).filter((k) => k !== "__paid_delta") },
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", v.id] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["admin-org-metrics"] });
    },
  });
}

// -------- Attendance --------
export function useAttendance(monthISO: string, clientId?: string) {
  const { start, end } = monthRange(monthISO);
  return useQuery({
    queryKey: ["attendance", monthISO, clientId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("attendance").select("*").gte("date", start).lte("date", end);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; status: "present" | "absent" | "freeze"; date?: string; client_name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("attendance").upsert(
        { trainer_id: user.id, client_id: input.client_id, date, status: input.status },
        { onConflict: "client_id,date" }
      );
      if (error) throw error;
      await logAudit({
        action: "attendance.marked",
        target_type: "client",
        target_id: input.client_id,
        target_label: input.client_name,
        description: `Marked ${input.client_name ?? "client"} as ${input.status} on ${date}`,
        metadata: { status: input.status, date },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useFreezeRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; startDate: string; days: number; client_name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (input.days <= 0) throw new Error("Days must be > 0");
      const rows: { trainer_id: string; client_id: string; date: string; status: "freeze" }[] = [];
      const start = new Date(input.startDate);
      for (let i = 0; i < input.days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        rows.push({
          trainer_id: user.id,
          client_id: input.client_id,
          date: d.toISOString().slice(0, 10),
          status: "freeze",
        });
      }
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "client_id,date" });
      if (error) throw error;
      await logAudit({
        action: "membership.freeze",
        target_type: "client",
        target_id: input.client_id,
        target_label: input.client_name,
        description: `Froze ${input.client_name ?? "client"} membership for ${input.days} days from ${input.startDate}`,
        metadata: { startDate: input.startDate, days: input.days },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useUnfreezeAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; date: string; client_name?: string }) => {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("client_id", input.client_id)
        .eq("date", input.date)
        .eq("status", "freeze");
      if (error) throw error;
      await logAudit({
        action: "membership.unfreeze",
        target_type: "client",
        target_id: input.client_id,
        target_label: input.client_name,
        description: `Unfroze ${input.client_name ?? "client"} on ${input.date}`,
        metadata: { date: input.date },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

// -------- Derived dashboard stats --------
export function useDashboardStats(monthISO: string) {
  const clients = useClients();
  const attendance = useAttendance(monthISO);
  const loading = clients.isLoading || attendance.isLoading;

  const list = clients.data ?? [];
  const att = attendance.data ?? [];

  // Per-client attendance days this month
  const daysByClient = new Map<string, number>();
  for (const a of att) {
    if (a.status === "present") daysByClient.set(a.client_id, (daysByClient.get(a.client_id) ?? 0) + 1);
  }
  let monthlyIncentive = 0;
  for (const [, d] of daysByClient) monthlyIncentive += incentiveFor(d);

  const expiring = list.filter((c) => c.status === "expiring").length;
  const pendingPayments = list.reduce((s, c) => s + Math.max(0, c.balance), 0);
  const active = list.filter((c) => c.status === "active").length;
  const gtActive = list.filter((c) => (c as any).client_type === "GT" && c.status !== "expired").length;
  const ptActive = list.filter((c) => (c as any).client_type !== "GT" && c.status !== "expired").length;

  // Today's pending sessions = active clients without attendance today
  const today = new Date().toISOString().slice(0, 10);
  const todayClients = new Set(att.filter((a) => a.date === today).map((a) => a.client_id));
  const todaysSessions = list.filter((c) => c.status !== "expired" && !todayClients.has(c.id));

  return {
    loading,
    totalClients: list.length,
    activeClients: active,
    gtClients: gtActive,
    ptClients: ptActive,
    todaysSessionsCount: todaysSessions.length,
    todaysSessions: todaysSessions.slice(0, 6),
    monthlyIncentive: Math.round(monthlyIncentive),
    expiringMemberships: expiring,
    pendingPayments,
    daysByClient,
  };
}

// -------- Incentive page --------
export function useIncentives(monthISO: string) {
  const clients = useClients();
  const attendance = useAttendance(monthISO);
  const payments = usePayments(monthISO);

  const list = clients.data ?? [];
  const att = attendance.data ?? [];

  const daysByClient = new Map<string, number>();
  for (const a of att) if (a.status === "present") daysByClient.set(a.client_id, (daysByClient.get(a.client_id) ?? 0) + 1);

  const perClient = list.map((c) => {
    const d = daysByClient.get(c.id) ?? 0;
    return { client: c, days: d, incentive: incentiveFor(d) };
  });
  const total = perClient.reduce((s, x) => s + x.incentive, 0);
  const revenue = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return {
    loading: clients.isLoading || attendance.isLoading || payments.isLoading,
    total: Math.round(total),
    avgPerClient: list.length ? Math.round(total / list.length) : 0,
    revenue,
    perClient: perClient.sort((a, b) => b.incentive - a.incentive),
  };
}

// -------- Payments --------
export function usePayments(monthISO?: string) {
  return useQuery({
    queryKey: ["payments", monthISO ?? "all"],
    queryFn: async () => {
      let q = supabase.from("payments").select("*");
      if (monthISO) {
        const { start, end } = monthRange(monthISO);
        q = q.gte("paid_at", start).lte("paid_at", end + "T23:59:59");
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// -------- Notifications (derived live) --------
export type LiveNotification = {
  id: string;
  type: "expiry" | "payment" | "attendance";
  title: string;
  message: string;
  clientId?: string;
};

export function useLiveNotifications(): LiveNotification[] {
  const { data: clients = [] } = useClients();
  const out: LiveNotification[] = [];
  for (const c of clients) {
    if (c.status === "expiring") {
      out.push({
        id: `exp-${c.id}`,
        type: "expiry",
        title: "Membership expiring soon",
        message: `${c.name} — ${c.days_left} day${c.days_left === 1 ? "" : "s"} left`,
        clientId: c.id,
      });
    }
    if (c.status === "expired") {
      out.push({
        id: `expd-${c.id}`,
        type: "expiry",
        title: "Membership expired",
        message: `${c.name}'s plan has ended`,
        clientId: c.id,
      });
    }
    if (c.balance > 0) {
      out.push({
        id: `pay-${c.id}`,
        type: "payment",
        title: "Pending payment",
        message: `${c.name} owes ₹${c.balance.toLocaleString("en-IN")}`,
        clientId: c.id,
      });
    }
  }
  return out;
}
