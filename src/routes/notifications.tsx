import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Wallet, Info } from "lucide-react";
import { useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ForgeFit" }] }),
  component: NotificationsPage,
});

function iconFor(type: string) {
  if (type === "expiry") return AlertTriangle;
  if (type === "payment") return Wallet;
  return Info;
}

function NotificationsPage() {
  const { data: items = [], isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const del = useDeleteNotification();
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Inbox</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"} · {items.length} total
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
          <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
        </Button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">No notifications yet</div>
            <div className="mt-1 text-xs text-muted-foreground">Reminders and alerts will appear here.</div>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {items.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition hover:bg-muted/30",
                    !n.read && "bg-primary/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      n.type === "expiry" && "bg-warning/15 text-warning",
                      n.type === "payment" && "bg-destructive/15 text-destructive",
                      n.type !== "expiry" && n.type !== "payment" && "bg-info/15 text-info",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      {n.client_id && (
                        <Link to="/clients/$id" params={{ id: n.client_id }} className="text-primary hover:underline">
                          Open client →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!n.read && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markRead.mutate(n.id)} title="Mark read">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate(n.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
