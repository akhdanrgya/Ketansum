import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth/team";
import { allowedOrigin, readJson, privateHeaders } from "@/lib/auth/security";
export async function GET() {
  try {
    const session = await getTeamSession();
    if (!session)
      return NextResponse.json(
        { error: "Sesi berakhir atau akun tidak aktif. Silakan login." },
        { status: 401, headers: privateHeaders },
      );
    const { data, error } = await session.db.rpc("read_workspace");
    if (error)
      return NextResponse.json(
        { error: "Data belum dapat dimuat. Coba lagi." },
        { status: 503, headers: privateHeaders },
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
      { error: "Koneksi terputus. Coba lagi." },
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
    if (!session)
      return NextResponse.json(
        { error: "Sesi berakhir atau akun tidak aktif. Silakan login." },
        { status: 401, headers: privateHeaders },
      );
    const command = await readJson(request);
    const { data, error } = await session.db.rpc("workspace_command", {
      command,
    });
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === "P0001"
              ? error.message
              : "Data tidak valid atau tidak dapat disimpan. Periksa isian.",
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
      { error: "Request gagal. Periksa isian dan koneksi." },
      { status: 400, headers: privateHeaders },
    );
  }
}
