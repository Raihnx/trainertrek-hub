import { Bell, Search, ChevronDown, LogOut, User as UserIcon, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav, SidebarHeader } from "@/components/dashboard/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import { useProfile, useLiveNotifications } from "@/lib/queries";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/lib/notifications";
import { useAppStore, appStore } from "@/lib/app-store";
import { monthRange } from "@/lib/incentive";

function buildMonths(): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const iso = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
    out.push({ iso, label: x.toLocaleString("en-US", { month: "long", year: "numeric" }) });
  }
  return out;
}

export function Header() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const search = useAppStore((s) => s.search);
  const month = useAppStore((s) => s.month);
  const notifs = useLiveNotifications();
  const { data: persisted = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unreadPersisted = persisted.filter((n) => !n.read);
  const badgeCount = notifs.length + unreadPersisted.length;

  const handleLogout = async () => {
    try {
      const { logAudit, clearAuditActorCache } = await import("@/lib/audit");
      await logAudit({ action: "auth.logout", description: "Signed out" });
      clearAuditActorCache();
    } catch {}
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else window.location.replace("/auth");
  };

  const name = profile?.display_name ?? "Trainer";
  const avatar =
    profile?.avatar_url ??
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  const monthLabel = monthRange(month).label;
  const months = buildMonths();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-6 backdrop-blur-xl">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => appStore.setSearch(e.target.value)}
          placeholder="Search clients, packages, memberships…"
          className="h-10 border-border/70 bg-muted/40 pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary/40"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="hidden items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-muted/50 md:inline-flex">
          {monthLabel}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
          {months.map((m) => (
            <DropdownMenuItem key={m.iso} onClick={() => appStore.setMonth(m.iso)}>
              {m.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground/80 transition hover:bg-muted/50">
          <Bell className="h-[18px] w-[18px]" />
          {badgeCount > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-[0_0_8px_var(--color-primary)]">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-display text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">
                {unreadPersisted.length} unread · {notifs.length} live reminder{notifs.length === 1 ? "" : "s"}
              </div>
            </div>
            {unreadPersisted.length > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {badgeCount === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">All caught up 🎉</div>
            ) : (
              <>
                {unreadPersisted.slice(0, 6).map((n) => (
                  <div
                    key={n.id}
                    className="group flex items-start gap-3 border-b border-border/40 bg-primary/[0.04] px-4 py-3 text-left"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <button
                      onClick={() => n.client_id && navigate({ to: "/clients/$id", params: { id: n.client_id } })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{n.message}</div>
                    </button>
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-primary"
                    >
                      Read
                    </button>
                  </div>
                ))}
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => n.clientId && navigate({ to: "/clients/$id", params: { id: n.clientId } })}
                    className="flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-muted/30"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.type === "expiry" ? "bg-warning" : n.type === "payment" ? "bg-destructive" : "bg-info"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{n.message}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="border-t border-border px-4 py-2">
            <Link to="/notifications" className="block text-center text-xs font-semibold uppercase tracking-wider text-primary hover:underline">
              View all notifications
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 py-1.5 pl-1.5 pr-3 transition hover:bg-muted/50">
          <img src={avatar} alt={name} className="h-8 w-8 rounded-md object-cover ring-1 ring-primary/40" />
          <div className="hidden leading-tight md:block">
            <div className="text-sm font-semibold">{name}</div>
            <div className="text-[11px] text-muted-foreground">{profile?.level ?? "Trainer"}</div>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-semibold">{name}</div>
            <div className="text-xs font-normal text-muted-foreground">{profile?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
