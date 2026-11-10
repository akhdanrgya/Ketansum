import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Isi URL dan publishable key di .env.local.");
  process.exit(1);
}
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  },
});
let failed = false;
for (const table of ["products", "settings"]) {
  const { error, count } = await db
    .from(table)
    .select("id", { count: "exact" })
    .limit(1);
  if (error) {
    failed = true;
    console.error(
      `${table}: gagal (${error.code || "network"}). ${error.code === "PGRST205" ? "Jalankan migrasi database terlebih dahulu." : "Periksa project, key, koneksi, dan migrasi."}`,
    );
  } else
    console.log(`${table}: terhubung, ${count} baris dapat diakses publik.`);
}
const { error } = await db.rpc("read_workspace");
if (!error) {
  failed = true;
  console.error(
    "Workspace terbuka untuk publik. Periksa izin RPC sebelum dipakai.",
  );
} else if (["42501", "PGRST301", "PGRST302"].includes(error.code)) {
  console.log("Workspace privat: akses anonim ditolak.");
} else {
  failed = true;
  console.error(
    `Pemeriksaan workspace belum lolos (${error.code || "network"}). Periksa migrasi dan koneksi.`,
  );
}
console.log(
  `Mode demo: ${process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? "aktif" : "nonaktif"}.`,
);
process.exitCode = failed ? 1 : 0;
