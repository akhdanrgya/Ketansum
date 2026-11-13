import { getTeamSession } from "@/lib/auth/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { privateHeaders } from "@/lib/auth/security";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getTeamSession();
    if (!session)
      return new Response("Login diperlukan.", {
        status: 401,
        headers: privateHeaders,
      });
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(id))
      return new Response("Tidak ditemukan.", {
        status: 404,
        headers: privateHeaders,
      });
    // Proofs exist only for public preorders, which both active roles may handle.
    const { data, error } = await createAdminClient()
      .from("payment_proofs")
      .select("image_base64")
      .eq("order_id", id)
      .maybeSingle();
    if (error || !data)
      return new Response("Bukti tidak ditemukan.", {
        status: 404,
        headers: privateHeaders,
      });
    return new Response(
      new Uint8Array(Buffer.from(data.image_base64, "base64")),
      {
        headers: {
          ...privateHeaders,
          "Content-Type": "image/jpeg",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": 'inline; filename="bukti-pembayaran.jpg"',
        },
      },
    );
  } catch {
    return new Response("Bukti belum dapat dimuat.", {
      status: 503,
      headers: privateHeaders,
    });
  }
}
