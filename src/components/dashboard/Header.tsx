import { Bell, Search, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Header() {
  const [profile, setProfile] = useState<{
    display_name: string | null;
    avatar_url: string | null;
    level: string | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, level")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(
        data ?? {
          display_name: user.email?.split("@")[0] ?? "Trainer",
          avatar_url: null,
          level: "Trainer",
        }
      );
    };
    load();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else window.location.replace("/auth");
  };

  const name = profile?.display_name ?? "Trainer";
  const avatar =
    profile?.avatar_url ??
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/70 px-6 backdrop-blur-xl">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients, sessions, payments…"
          className="h-10 border-border/70 bg-muted/40 pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary/40"
        />
      </div>

      <button className="hidden items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-muted/50 md:inline-flex">
        June 2026
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground/80 transition hover:bg-muted/50">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
      </button>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 py-1.5 pl-1.5 pr-3">
        <img
          src={avatar}
          alt={name}
          className="h-8 w-8 rounded-md object-cover ring-1 ring-primary/40"
        />
        <div className="hidden leading-tight md:block">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-[11px] text-muted-foreground">{profile?.level ?? "Trainer"}</div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        title="Log out"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground/80 transition hover:bg-destructive/20 hover:text-destructive"
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </header>
  );
}
