import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PublicPreorder } from "@/components/public-preorder";
import { deliveryDates } from "@/lib/preorder-schedule";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Preorder Kampus C",
  description:
    "Pesan ketan susu dan dimsum. Pengiriman ke Kampus C Telkom University setiap Selasa dan Kamis, pukul 11.00–17.00 WIB.",
};
export default async function Page() {
  const db = await createClient();
  const { data, error } = await db
    .from("products")
    .select("id,name,category,description,price,active,available,art,image")
    .eq("active", true)
    .order("art");
  if (error) throw Error("Menu belum dapat dimuat. Coba lagi.");
  return <PublicPreorder products={data || []} dates={deliveryDates()} />;
}
