import { supabase } from "@/integrations/supabase/client";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function uploadAvatar(file: File, folder: "profile" | "clients" = "profile"): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, ONE_YEAR);
  if (error) throw error;
  return data.signedUrl;
}
