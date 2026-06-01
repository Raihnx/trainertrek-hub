import { createFileRoute } from "@tanstack/react-router";
import { Search, Plus, Filter } from "lucide-react";
import { ClientsTable } from "@/components/dashboard/ClientsTable";
import { clients } from "@/lib/mock-data";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "My Clients — ForgeFit" }, { name: "description", content: "Manage your assigned personal training clients." }] }),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">My Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">{clients.length} assigned · {clients.filter(c => c.status === "active").length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search clients…" className="h-10 w-64 rounded-lg border border-border bg-muted/30 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm font-medium hover:bg-muted/50">
            <Filter className="h-4 w-4" /> Filter
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95">
            <Plus className="h-4 w-4" /> Add client
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <ClientsTable clients={clients} />
      </div>
    </div>
  );
}
