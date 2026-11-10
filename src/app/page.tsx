import { Landing } from "@/components/landing";
import { menu, initialSettings, isDemo, hasSupabase } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!isDemo && hasSupabase) {
    const db = await createClient();
    const [{ data: products, error }, { data: settings }] = await Promise.all([
      db
        .from("products")
        .select("id,name,category,description,price,active,available,art,image")
        .eq("active", true)
        .order("created_at"),
      db.from("settings").select("value").eq("id", 1).single(),
    ]);
    if (error)
      throw Error("Menu belum dapat dimuat. Periksa migrasi Supabase.");
    return (
      <Landing
        products={products || []}
        settings={settings?.value || initialSettings}
      />
    );
  }
  return <Landing products={menu} />;
}
