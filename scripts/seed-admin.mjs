import { createClient } from "@supabase/supabase-js";

// Run only from the local terminal. Never import this script into the app.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.KETANSUM_ADMIN_EMAIL || "admin@ketansum.com";
const password = process.env.KETANSUM_ADMIN_PASSWORD;
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  },
};
function fail(message) {
  throw new Error(message);
}

async function main() {
  if (!url || !publicKey)
    fail("URL dan publishable key Supabase belum lengkap.");
  if (!secret)
    fail(
      "Tambahkan SUPABASE_SECRET_KEY atau SUPABASE_SERVICE_ROLE_KEY di .env.local. Publishable key tidak bisa membuat akun admin.",
    );
  if (!password || password.length < 8)
    fail("Isi KETANSUM_ADMIN_PASSWORD di .env.local, minimal 8 karakter.");
  const admin = createClient(url, secret, options);
  const client = createClient(url, publicKey, options);
  // Preflight prevents creating an Auth user when the application schema is absent.
  for (const table of ["profiles", "products"]) {
    const { error } = await admin.from(table).select("id").limit(1);
    if (error)
      fail(
        `Preflight ${table} gagal (${error.code || "network"}). Jalankan migrasi dan periksa secret key.`,
      );
  }
  let user;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error)
      fail(
        "Tidak dapat membaca daftar akun Auth. Periksa secret key dan koneksi.",
      );
    user = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user || data.users.length < 100) break;
  }
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Admin Ketansum" },
    });
    if (error || !data.user)
      fail(
        `Pembuatan akun Auth gagal (${error?.code || "unknown"}). Tidak ada password atau key yang dicetak.`,
      );
    user = data.user;
    console.log(
      "Akun Auth admin berhasil dibuat tanpa mengirim email konfirmasi.",
    );
  } else console.log("Akun Auth sudah ada; password tidak ditimpa.");

  const { data: login, error: loginError } =
    await client.auth.signInWithPassword({ email, password });
  if (loginError || login.user?.id !== user.id)
    fail(
      "Login dengan kredensial seed gagal. Profil belum dipromosikan; periksa password atau status akun.",
    );
  try {
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: user.id,
        name: "Admin Ketansum",
        role: "admin",
        active: true,
      },
      { onConflict: "id" },
    );
    if (profileError)
      fail(
        `Auth tersedia, tetapi penyimpanan profil admin gagal (${profileError.code}). Perbaiki izin/skema, lalu jalankan seed kembali.`,
      );
    const { data: profile, error: readError } = await client
      .from("profiles")
      .select("role,active")
      .eq("id", user.id)
      .single();
    if (readError || profile?.role !== "admin" || !profile?.active)
      fail("Verifikasi profil admin gagal.");
    const { data: workspace, error: workspaceError } =
      await client.rpc("read_workspace");
    if (workspaceError || workspace?.role !== "admin")
      fail(
        "Profil tersimpan, tetapi akses workspace gagal. Periksa migrasi RPC.",
      );
    console.log(
      `Seed selesai: ${email}. Login, role admin, dan akses workspace terverifikasi.`,
    );
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
