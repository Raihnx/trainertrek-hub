import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Award, Calendar, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useProfile, useUpdateProfile } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — ForgeFit" }, { name: "description", content: "Trainer profile and credentials." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    address: "",
    specialization: "",
    certifications: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        specialization: profile.specialization ?? "",
        certifications: profile.certifications ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
  }, [profile]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        display_name: form.display_name,
        phone: form.phone,
        address: form.address,
        specialization: form.specialization,
        certifications: form.certifications,
        avatar_url: form.avatar_url || null,
      },
      {
        onSuccess: () => toast.success("Profile updated"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      },
    );
  };

  const name = form.display_name || "Trainer";
  const avatar = form.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your trainer profile and credentials.</p>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass relative overflow-hidden rounded-2xl p-6 lg:col-span-1">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <img src={avatar} alt={name} className="h-28 w-28 rounded-2xl object-cover ring-2 ring-primary/40" />
            <h2 className="mt-4 font-display text-xl font-semibold">{name}</h2>
            <p className="text-sm text-muted-foreground">{profile?.level ?? "Trainer"}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Award className="h-3.5 w-3.5" /> Verified trainer
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground"><Mail className="h-4 w-4 text-primary" /> {form.email || "—"}</div>
            <div className="flex items-center gap-3 text-muted-foreground"><Phone className="h-4 w-4 text-primary" /> {form.phone || "—"}</div>
            <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> {form.address || "—"}</div>
            <div className="flex items-center gap-3 text-muted-foreground"><Calendar className="h-4 w-4 text-primary" /> Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</div>
          </div>
        </div>

        <div className="glass space-y-4 rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">Edit profile</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} disabled className="bg-muted/30" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Specialization</Label>
              <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Certifications</Label>
              <Textarea rows={3} value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Photo URL (optional)</Label>
              <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
