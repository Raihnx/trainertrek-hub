import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Forgot password — ZAK's GYM" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
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
          <h1 className="text-xl font-semibold">Reset your password</h1>
          {sent ? (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
              If an account exists for <span className="font-semibold">{email}</span>, a reset link has been sent.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}
          <Link to="/auth" className="mt-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
