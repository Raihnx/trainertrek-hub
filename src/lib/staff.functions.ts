import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(120),
  role: z.enum(["admin", "receptionist", "trainer"]),
});

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is the primary admin (only the first-created admin can manage staff)
    const { data: isPrimary, error: roleErr } = await supabase
      .rpc("is_primary_admin", { _user_id: userId });
    if (roleErr) throw new Error(roleErr.message);
    if (!isPrimary) throw new Error("Only the primary admin can create staff accounts");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create the auth user (auto-confirmed)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }

    const newUserId = created.user.id;

    // The handle_new_user trigger assigned a default role (trainer/admin).
    // Replace it with the chosen role.
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId);
    if (delErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(delErr.message);
    }

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (insErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(insErr.message);
    }

    // Ensure profile reflects the display name (trigger may have used email prefix)
    await supabaseAdmin
      .from("profiles")
      .update({ display_name: data.displayName, email: data.email })
      .eq("id", newUserId);

    return { userId: newUserId };
  });

const DeleteInput = z.object({ userId: z.string().uuid() });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("You cannot delete your own account");

    // Verify caller is the primary admin
    const { data: isPrimary, error: roleErr } = await supabase
      .rpc("is_primary_admin", { _user_id: userId });
    if (roleErr) throw new Error(roleErr.message);
    if (!isPrimary) throw new Error("Only the primary admin can delete staff accounts");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Clean linked rows (FKs to auth.users are mostly ON DELETE CASCADE, but
    // be explicit for clarity and to avoid orphans if cascade is missing).
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true };
  });
