import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { allowedOrigin, privateHeaders } from "@/lib/auth/security";
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return NextResponse.json(
      { error: "Permintaan tidak diizinkan." },
      { status: 403, headers: privateHeaders },
    );
  try {
    const db = await createClient();
    const { error } = await db.auth.signOut({ scope: "local" });
    if (error)
      return NextResponse.json(
        { error: "Keluar gagal. Coba lagi." },
        { status: 503, headers: privateHeaders },
      );
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      { error: "Koneksi gagal. Coba lagi." },
      { status: 503, headers: privateHeaders },
    );
  }
}
