import { cn } from "@/lib/utils";

export type ClientStatus = "active" | "expiring" | "expired";

const map: Record<ClientStatus, { label: string; cls: string }> = {
  active:   { label: "Active",         cls: "bg-success/10 text-success border-success/30" },
  expiring: { label: "Expiring Soon",  cls: "bg-warning/10 text-warning border-warning/30" },
  expired:  { label: "Expired",        cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", m.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
