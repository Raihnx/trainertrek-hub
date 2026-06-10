import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dumbbell, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Set new password — ZAK's GYM" }] }),
});

const rules = [
  { test: (s: string) => s.length >= 8,         label: "At least 8 characters" },
  { test: (s: string) => /[A-Z]/.test(s),       label: "One uppercase letter" },
  { test: (s: string) => /[a-z]/.test(s),       label: "One lowercase letter" },
  { test: (s: string) => /[0-9]/.test(s),       label: "One number" },
  { test: (s: string) => /[^A-Za-z0-9]/.test(s),label: "One special character" },
];

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = rules.every((r) => r.test(password));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { toast.error("Password doesn't meet all requirements"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.7_0.18_55_/_0.18),transparent)]" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-amber-500 text-primary-foreground shadow-lg">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div className="font-display text-2xl font-bold">ZAK<span className="text-gradient-gold">'S GYM</span></div>
        </div>

        <div className="glass w-full rounded-2xl border border-border/60 p-7 shadow-2xl">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <Input type="password" placeholder="New password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <ul className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2">
              {rules.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.label} className={`flex items-center gap-2 text-xs ${ok ? "text-success" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>
            <Button type="submit" className="w-full" disabled={loading || !valid}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
