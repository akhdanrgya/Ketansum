import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedOrigin, readJson, privateHeaders } from "@/lib/auth/security";
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return NextResponse.json(
      { error: "Permintaan tidak diizinkan." },
      { status: 403, headers: privateHeaders },
    );
  try {
    const body = (await readJson(request, 4096)) as Record<string, unknown>;
    if (
      typeof body?.email !== "string" ||
      typeof body?.password !== "string" ||
      body.email.length > 254 ||
      body.password.length > 256 ||
      !body.email.includes("@") ||
      body.password.length < 8
    )
      return NextResponse.json(
        { error: "Email atau password tidak valid." },
        { status: 400, headers: privateHeaders },
      );
    const email = body.email.trim().toLowerCase();
    const service = createAdminClient();
    const { data: allowed, error: limitError } = await service.rpc(
      "consume_login_attempt",
      { bucket: createHash("sha256").update(email).digest("hex") },
    );
    if (limitError)
      return NextResponse.json(
        { error: "Login belum tersedia. Hubungi pengelola." },
        { status: 503, headers: privateHeaders },
      );
    if (!allowed)
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
        { status: 429, headers: { ...privateHeaders, "Retry-After": "900" } },
      );
    const db = await createClient();
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password: body.password,
    });
    if (error || !data.user)
      return NextResponse.json(
        { error: "Email atau password salah, atau akun tidak aktif." },
        { status: 401, headers: privateHeaders },
      );
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role,active")
      .eq("id", data.user.id)
      .single();
    if (
      profileError ||
      !profile?.active ||
      !["admin", "cashier"].includes(profile.role)
    ) {
      await db.auth.signOut({ scope: "local" });
      return NextResponse.json(
        { error: "Email atau password salah, atau akun tidak aktif." },
        { status: 401, headers: privateHeaders },
      );
    }
    return NextResponse.json(
      { redirect: profile.role === "cashier" ? "/admin/kasir" : "/admin" },
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Login gagal. Periksa koneksi lalu coba lagi." },
      { status: 503, headers: privateHeaders },
    );
  }
}
