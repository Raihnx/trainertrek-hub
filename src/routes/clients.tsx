import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Search, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { useClients, useAttendance } from "@/lib/queries";
import { useAppStore } from "@/lib/app-store";
import { appStore } from "@/lib/app-store";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "My Clients — ForgeFit" }, { name: "description", content: "Manage your assigned personal training clients." }] }),
  component: ClientsPage,
});

type FilterKey = "all" | "active" | "expired" | "partial" | "fully_paid" | "expiring";
type TypeKey = "all" | "GT" | "PT";

function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const month = useAppStore((s) => s.month);
  const search = useAppStore((s) => s.search);
  const { data: att = [] } = useAttendance(month);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pkgFilter, setPkgFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeKey>("all");

  const packages = useMemo(() => Array.from(new Set(clients.map((c) => c.package_name).filter(Boolean) as string[])), [clients]);

  const typeCounts = useMemo(() => {
    let gt = 0, pt = 0;
    for (const c of clients) {
      if ((c as any).client_type === "GT") gt++;
      else pt++;
    }
    return { all: clients.length, GT: gt, PT: pt };
  }, [clients]);

  const packages = useMemo(() => Array.from(new Set(clients.map((c) => c.package_name).filter(Boolean) as string[])), [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (q && !(c.name.toLowerCase().includes(q) || (c.package_name ?? "").toLowerCase().includes(q))) return false;
      if (pkgFilter !== "all" && c.package_name !== pkgFilter) return false;
      switch (filter) {
        case "active": return c.status === "active";
        case "expired": return c.status === "expired";
        case "expiring": return c.status === "expiring";
        case "partial": return c.balance > 0;
        case "fully_paid": return c.balance <= 0;
        default: return true;
      }
    });
  }, [clients, search, filter, pkgFilter]);

  const attendancePct = useMemo(() => {
    const days = new Map<string, number>();
    for (const a of att) if (a.status === "present") days.set(a.client_id, (days.get(a.client_id) ?? 0) + 1);
    const m = new Map<string, number>();
    for (const c of clients) m.set(c.id, Math.min(100, ((days.get(c.id) ?? 0) / 30) * 100));
    return m;
  }, [att, clients]);

  const chip = (k: FilterKey, label: string) => (
    <button
      key={k}
      onClick={() => setFilter(k)}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        filter === k ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
  <>
    <Outlet />

    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            My Clients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} total ·{" "}
            {clients.filter((c) => c.status === "active").length} active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(e) => appStore.setSearch(e.target.value)}
              placeholder="Search clients…"
              className="h-10 w-64 rounded-lg border border-border bg-muted/30 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
            />
          </div>

          <AddClientDialog />
        </div>
      </div>

      <div className="glass space-y-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />

          {chip("all", "All")}
          {chip("active", "Active")}
          {chip("expiring", "Expiring soon")}
          {chip("expired", "Expired")}
          {chip("partial", "Partial paid")}
          {chip("fully_paid", "Fully paid")}

          {packages.length > 0 && (
            <select
              value={pkgFilter}
              onChange={(e) => setPkgFilter(e.target.value)}
              className="ml-auto rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium"
            >
              <option value="all">All packages</option>

              {packages.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading clients…
          </div>
        ) : (
          <ClientsTable
            clients={filtered}
            attendancePct={attendancePct}
          />
        )}
      </div>
    </div>
  </>
);
}
