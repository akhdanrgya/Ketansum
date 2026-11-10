import { notFound } from "next/navigation";
import { Admin } from "@/components/admin";
const pages = [
  "dashboard",
  "kasir",
  "produk",
  "transaksi",
  "pengeluaran",
  "laporan",
  "konten",
  "pengaturan",
];
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const page = section?.[0] || "dashboard";
  if (!pages.includes(page) || (section?.length || 0) > 1) notFound();
  return <Admin page={page} />;
}
