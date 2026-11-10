import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedOrigin, readJson, privateHeaders } from "@/lib/auth/security";
export async function GET() {
  try {
    const session = await getTeamSession();
    if (session?.profile.role !== "admin")
      return NextResponse.json(
        { error: "Akses khusus admin." },
        { status: 403, headers: privateHeaders },
      );
    const service = createAdminClient();
    const { data: profiles, error } = await service
      .from("profiles")
      .select("id,name,role,active")
      .order("name");
    if (error) throw error;
    const users = await Promise.all(
      (profiles || []).map(async (p) => {
        const { data } = await service.auth.admin.getUserById(p.id);
        return { ...p, email: data.user?.email || "" };
      }),
    );
    return NextResponse.json({ users }, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      { error: "Daftar tim belum dapat dimuat." },
      { status: 503, headers: privateHeaders },
    );
  }
}
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return NextResponse.json(
      { error: "Permintaan tidak diizinkan." },
      { status: 403, headers: privateHeaders },
    );
  try {
    const session = await getTeamSession();
    if (session?.profile.role !== "admin")
      return NextResponse.json(
        { error: "Akses khusus admin." },
        { status: 403, headers: privateHeaders },
      );
    const body = (await readJson(request, 4096)) as Record<string, unknown>;
    const service = createAdminClient();
    if (body.action === "create") {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.length > 100 ||
        typeof body.email !== "string" ||
        body.email.length > 254 ||
        !body.email.includes("@") ||
        typeof body.password !== "string" ||
        body.password.length < 12 ||
        body.password.length > 128 ||
        !/[a-z]/.test(body.password) ||
        !/[A-Z]/.test(body.password) ||
        !/[0-9]/.test(body.password)
      )
        return NextResponse.json(
          {
            error:
              "Isi nama/email dan password minimal 12 karakter, dengan huruf besar, kecil, dan angka.",
          },
          { status: 400, headers: privateHeaders },
        );
      const { data, error } = await service.auth.admin.createUser({
        email: body.email.trim().toLowerCase(),
        password: body.password,
        email_confirm: true,
        user_metadata: { name: body.name.trim() },
      });
      if (error || !data.user)
        return NextResponse.json(
          { error: "Akun tidak dapat dibuat. Email mungkin sudah digunakan." },
          { status: 400, headers: privateHeaders },
        );
      const { error: profileError } = await service
        .from("profiles")
        .insert({
          id: data.user.id,
          name: body.name.trim(),
          role: "cashier",
          active: true,
        });
      if (profileError)
        return NextResponse.json(
          {
            error:
              "Akun Auth dibuat, tetapi profil belum aktif. Hubungi pengelola database untuk melengkapi profil kasir.",
          },
          { status: 503, headers: privateHeaders },
        );
      await service
        .from("audit_logs")
        .insert({
          actor_id: session.user.id,
          action: "cashier_created",
          entity_id: data.user.id,
        });
    } else if (body.action === "active") {
      if (typeof body.id !== "string" || typeof body.active !== "boolean")
        return NextResponse.json(
          { error: "Data tidak valid." },
          { status: 400, headers: privateHeaders },
        );
      const { data: target, error } = await service
        .from("profiles")
        .select("role")
        .eq("id", body.id)
        .single();
      if (error || target?.role !== "cashier")
        return NextResponse.json(
          { error: "Hanya status akun kasir yang bisa diubah di sini." },
          { status: 400, headers: privateHeaders },
        );
      const { error: updateError } = await service
        .from("profiles")
        .update({ active: body.active })
        .eq("id", body.id)
        .eq("role", "cashier");
      if (updateError) throw updateError;
      await service
        .from("audit_logs")
        .insert({
          actor_id: session.user.id,
          action: body.active ? "cashier_enabled" : "cashier_disabled",
          entity_id: body.id,
        });
    } else
      return NextResponse.json(
        { error: "Operasi tidak tersedia." },
        { status: 400, headers: privateHeaders },
      );
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      { error: "Perubahan tim gagal. Periksa koneksi." },
      { status: 503, headers: privateHeaders },
    );
  }
}
