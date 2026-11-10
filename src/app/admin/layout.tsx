import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemo, hasSupabase } from "@/lib/data";
export const metadata: Metadata = {
  title: "Ruang Tim",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDemo) {
    if (!hasSupabase) redirect("/login");
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) redirect("/login");
    const { data } = await db
      .from("profiles")
      .select("role,active")
      .eq("id", user.id)
      .single();
    if (!data?.active) redirect("/login");
  }
  return children;
}
