import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Award, Calendar } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — ForgeFit" }, { name: "description", content: "Trainer profile and certifications." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your trainer profile and credentials.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass relative overflow-hidden rounded-2xl p-6 lg:col-span-1">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <img src="https://i.pravatar.cc/200?img=15" alt="Alex Morgan" className="h-28 w-28 rounded-2xl object-cover ring-2 ring-primary/40" />
            <h2 className="mt-4 font-display text-xl font-semibold">Alex Morgan</h2>
            <p className="text-sm text-muted-foreground">Senior Personal Trainer · Level 4</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Award className="h-3.5 w-3.5" /> Top 5% trainer
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground"><Mail className="h-4 w-4 text-primary" /> alex.morgan@forgefit.app</div>
            <div className="flex items-center gap-3 text-muted-foreground"><Phone className="h-4 w-4 text-primary" /> +91 98765 43210</div>
            <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Mumbai, Powai branch</div>
            <div className="flex items-center gap-3 text-muted-foreground"><Calendar className="h-4 w-4 text-primary" /> Joined Sept 2022</div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold">Performance overview</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Lifetime Clients", value: "142" },
              { label: "Retention Rate",   value: "87%" },
              { label: "Avg Attendance",   value: "84%" },
              { label: "Avg Rating",       value: "4.9" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          <h3 className="mb-3 mt-6 font-display text-lg font-semibold">Certifications</h3>
          <div className="space-y-2">
            {[
              { name: "ACE Certified Personal Trainer",          year: "2022", color: "bg-success" },
              { name: "NSCA Strength & Conditioning Specialist", year: "2023", color: "bg-info" },
              { name: "Precision Nutrition Level 1",             year: "2024", color: "bg-primary" },
            ].map((cert) => (
              <div key={cert.name} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                <span className={`h-2 w-2 rounded-full ${cert.color}`} />
                <div className="flex-1 text-sm font-medium">{cert.name}</div>
                <div className="text-xs text-muted-foreground">{cert.year}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
