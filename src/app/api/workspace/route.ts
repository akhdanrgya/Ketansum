import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, isDemo } from "@/lib/data";
async function session() {
  if (isDemo || !hasSupabase) return null;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  return db;
}
export async function GET() {
  const db = await session();
  if (!db)
    return NextResponse.json(
      { error: "Sesi tidak tersedia. Silakan login." },
      { status: 401 },
    );
  const { data, error } = await db.rpc("read_workspace");
  if (error)
    return NextResponse.json(
      {
        error: "Workspace belum tersedia. Periksa profil dan migrasi Supabase.",
      },
      { status: 403 },
    );
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
  const db = await session();
  if (!db)
    return NextResponse.json(
      { error: "Sesi berakhir. Silakan login." },
      { status: 401 },
    );
  try {
    const text = await request.text();
    if (text.length > 2_200_000)
      return NextResponse.json(
        { error: "Ukuran data terlalu besar." },
        { status: 413 },
      );
    const command = JSON.parse(text);
    const { data, error } = await db.rpc("workspace_command", { command });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Request tidak valid." },
      { status: 400 },
    );
  }
}
