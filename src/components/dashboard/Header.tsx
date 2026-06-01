import { Bell, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/70 px-6 backdrop-blur-xl">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients, sessions, payments…"
          className="h-10 border-border/70 bg-muted/40 pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary/40"
        />
      </div>

      <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-muted/50">
        June 2026
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground/80 transition hover:bg-muted/50">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
      </button>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 py-1.5 pl-1.5 pr-3">
        <img
          src="https://i.pravatar.cc/80?img=15"
          alt="Trainer"
          className="h-8 w-8 rounded-md object-cover ring-1 ring-primary/40"
        />
        <div className="hidden leading-tight md:block">
          <div className="text-sm font-semibold">Alex Morgan</div>
          <div className="text-[11px] text-muted-foreground">Senior PT · Lvl 4</div>
        </div>
      </div>
    </header>
  );
}
