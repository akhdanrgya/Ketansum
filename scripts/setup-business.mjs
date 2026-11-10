import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
try {
  const { error } = await db.auth.signInWithPassword({
    email: process.env.KETANSUM_ADMIN_EMAIL,
    password: process.env.KETANSUM_ADMIN_PASSWORD,
  });
  if (error) throw Error("Login admin gagal.");
  const { data, error: loadError } = await db.rpc("read_workspace");
  if (loadError || data?.role !== "admin")
    throw Error("Akses workspace admin gagal.");
  const qr = await readFile("supabase/assets/qris-merchant.jpg");
  const settings = {
    ...data.settings,
    merchant: "NADYA CALYSTHA ANDINI",
    qris: `data:image/jpeg;base64,${qr.toString("base64")}`,
  };
  const { error: settingError } = await db.rpc("workspace_command", {
    command: { type: "settings", settings },
  });
  if (settingError) throw Error("Penyimpanan QRIS gagal.");
  const menu = [
    ["11111111-1111-4111-8111-111111111111", 5127, 10000],
    ["22222222-2222-4222-8222-222222222222", 6627, 12000],
    ["33333333-3333-4333-8333-333333333333", 9527, 15000],
    ["44444444-4444-4444-8444-444444444444", 9327, 15000],
    ["55555555-5555-4555-8555-555555555555", 9000, 12000],
    ["66666666-6666-4666-8666-666666666666", 10500, 15000],
  ];
  for (const [id, cost, price] of menu) {
    const product = data.products.find((p) => p.id === id);
    if (!product) throw Error("Produk tidak ditemukan.");
    const { error } = await db.rpc("workspace_command", {
      command: { type: "product", product: { ...product, cost, price } },
    });
    if (error) throw Error("Penyimpanan HPP gagal.");
  }
  const { data: verified, error: verifyError } = await db.rpc("read_workspace");
  if (verifyError || verified.settings.qris !== settings.qris)
    throw Error("Verifikasi QRIS gagal.");
  for (const [id, cost, price] of menu) {
    const product = verified.products.find((p) => p.id === id);
    if (product?.cost !== cost || product?.price !== price)
      throw Error("Verifikasi harga/HPP gagal.");
    console.log(`${product.name}: harga Rp${price}, HPP Rp${cost}.`);
  }
  console.log(
    "QRIS asli, merchant, dan keenam HPP berhasil tersimpan dan diverifikasi.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.auth.signOut({ scope: "local" });
}
