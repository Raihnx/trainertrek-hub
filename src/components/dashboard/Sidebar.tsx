import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, CalendarCheck, BadgeCheck, Trophy, FileBarChart2, User, Dumbbell, Shield, ScrollText, Bell, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin, useUserRole } from "@/lib/useRole";
import { useUnreadCount } from "@/lib/notifications";
import { useMyPermissions } from "@/lib/permissions";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const trainerItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "My Clients", icon: Users },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/memberships", label: "Memberships", icon: BadgeCheck },
  { to: "/incentives", label: "Incentives", icon: Trophy },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

const receptionistItems: NavItem[] = [
  { to: "/", label: "Front desk", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "Members", icon: Users },
  { to: "/trainers-overview", label: "Trainers floor", icon: LayoutGrid },
  { to: "/memberships", label: "Memberships", icon: BadgeCheck },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/profile", label: "Profile", icon: User },
];

const adminExtras: NavItem[] = [
  { to: "/trainers-overview", label: "Trainers floor", icon: LayoutGrid },
  { to: "/staff", label: "Staff", icon: Shield },
  { to: "/audit", label: "Audit log", icon: ScrollText },
];

function useNavItems() {
  const { isAdmin } = useIsAdmin();
  const { data: role } = useUserRole();
  const { data: perms } = useMyPermissions();
  let base = role === "receptionist" ? [...receptionistItems] : trainerItems;
  if (role === "receptionist" && perms?.has("reports.view") && !base.some((i) => i.to === "/reports")) {
    const idx = base.findIndex((i) => i.to === "/profile");
    const reportsItem = { to: "/reports", label: "Reports", icon: FileBarChart2 };
    base = idx === -1 ? [...base, reportsItem] : [...base.slice(0, idx), reportsItem, ...base.slice(idx)];
  }
  const items = isAdmin ? [...trainerItems, ...adminExtras] : base;
  return { items, role, isAdmin };
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { items } = useNavItems();
  const unread = useUnreadCount();

  return (
    <nav className="flex-1 space-y-1 p-3">
      {items.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[image:var(--gradient-primary)]" />
            )}
            <Icon className={cn("h-[18px] w-[18px] transition-colors", active && "text-primary")} />
            <span className="flex-1">{item.label}</span>
            {item.to === "/notifications" && unread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarHeader() {
  const { isAdmin } = useIsAdmin();
  const { data: role } = useUserRole();

  return (
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
        <Dumbbell className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-semibold tracking-tight">ZAK<span className="text-gradient-gold">'S GYM</span></div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {role === "receptionist" ? "Reception" : isAdmin ? "Admin" : "Trainer OS"}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { role } = useNavItems();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <SidebarHeader />
      <SidebarNav />
      {role !== "receptionist" && (
        <div className="m-3 rounded-xl border border-sidebar-border bg-[image:var(--gradient-surface)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Trophy className="h-4 w-4" />
            Top performer
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            You're in the top 5% of trainers this month. Keep it up!
          </p>
        </div>
      )}
    </aside>
  );
}
