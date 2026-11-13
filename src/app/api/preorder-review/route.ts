import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth/team";
import { allowedOrigin, readJson, privateHeaders } from "@/lib/auth/security";
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return NextResponse.json(
      { error: "Permintaan ditolak." },
      { status: 403, headers: privateHeaders },
    );
  try {
    const session = await getTeamSession();
    if (!session)
      return NextResponse.json(
        { error: "Login diperlukan." },
        { status: 401, headers: privateHeaders },
      );
    const body = (await readJson(request, 4096)) as Record<string, unknown>;
    if (
      typeof body?.id !== "string" ||
      !["approved", "rejected"].includes(String(body.decision)) ||
      typeof body.reason !== "string"
    )
      return NextResponse.json(
        { error: "Data tidak valid." },
        { status: 400, headers: privateHeaders },
      );
    const { data, error } = await session.db.rpc("review_public_preorder", {
      request_id: body.id,
      decision: body.decision,
      reason: body.reason,
    });
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === "P0001"
              ? error.message
              : "Pengajuan belum dapat diproses.",
        },
        { status: 400, headers: privateHeaders },
      );
    return NextResponse.json(
      {
        ...data,
        currentUserId: session.user.id,
        userName: session.profile.name,
      },
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Periksa koneksi dan coba lagi." },
      { status: 503, headers: privateHeaders },
    );
  }
}
