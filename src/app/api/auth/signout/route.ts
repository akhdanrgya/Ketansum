import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin tidak valid" }, { status: 403 });
  const db = await createClient();
  await db.auth.signOut();
  return NextResponse.json({ ok: true });
}
