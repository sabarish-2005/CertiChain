import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabaseConfig";

type Role = "college" | "company";

type AuthResult = {
  ok: boolean;
  error?: string;
};

export async function signInWithRole(email: string, password: string, role: Role): Promise<AuthResult> {
  if (!hasSupabaseConfig) {
    return { ok: false, error: "Supabase not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: error.message };
  }

  const { data, error: roleError } = await supabase
    .from("app_users")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (roleError) {
    await supabase.auth.signOut();
    return { ok: false, error: "Unable to validate role." };
  }

  if (!data || data.role !== role) {
    await supabase.auth.signOut();
    return { ok: false, error: "Access denied for this portal." };
  }

  return { ok: true };
}
