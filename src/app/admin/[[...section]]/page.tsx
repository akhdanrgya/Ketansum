import { notFound, redirect } from "next/navigation";
import { Admin } from "@/components/admin";
import { getTeamSession } from "@/lib/auth/team";
import { isDemo } from "@/lib/data";
const pages = [
  "dashboard",
  "preorder",
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
  if (!isDemo) {
    const session = await getTeamSession();
    if (!session) redirect("/login");
    if (
      session.profile.role === "cashier" &&
      !["dashboard", "preorder", "kasir"].includes(page)
    )
      redirect("/admin/kasir");
  }
  return <Admin page={page} />;
}
