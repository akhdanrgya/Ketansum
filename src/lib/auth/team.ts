import "server-only";
import { createClient } from "@/lib/supabase/server";
export async function getTeamSession() {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id,name,role,active")
    .eq("id", user.id)
    .single();
  if (
    profileError ||
    !profile?.active ||
    !["admin", "cashier"].includes(profile.role)
  )
    return null;
  return { db, user, profile };
}
