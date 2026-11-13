import { NextResponse } from "next/server";
import { createHash, createHmac } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedOrigin, readJson, privateHeaders } from "@/lib/auth/security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return NextResponse.json(
      { error: "Permintaan tidak diizinkan." },
      { status: 403, headers: privateHeaders },
    );
  try {
    const body = (await readJson(request, 2_200_000)) as Record<
      string,
      unknown
    >;
    if (
      !body ||
      typeof body.token !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.token) ||
      !["quote", "submit"].includes(String(body.action))
    )
      return NextResponse.json(
        { error: "Data pesanan tidak valid." },
        { status: 400, headers: privateHeaders },
      );
    const db = createAdminClient();
    const ip =
      request.headers.get("x-vercel-forwarded-for") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "local";
    const secret =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = createHmac("sha256", secret)
      .update("public-preorder:" + String(body.action) + ":" + ip)
      .digest("hex");
    const { data: allowed, error: rateError } = await db.rpc(
      "consume_login_attempt",
      { bucket },
    );
    if (rateError) throw Error("RATE_UNAVAILABLE");
    if (!allowed)
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
        { status: 429, headers: { ...privateHeaders, "Retry-After": "900" } },
      );
    const token_hash = createHash("sha256").update(body.token).digest("hex");
    if (body.action === "quote") {
      const { data, error } = await db.rpc("public_preorder_quote", {
        token_hash,
        request: body.order || {},
      });
      if (error)
        return NextResponse.json(
          {
            error:
              error.code === "P0001"
                ? error.message
                : "Preorder belum dapat diproses. Periksa isian atau coba lagi nanti.",
          },
          {
            status: error.code === "P0001" ? 400 : 503,
            headers: privateHeaders,
          },
        );
      const { data: settings, error: settingsError } = await db
        .from("settings")
        .select("value")
        .eq("id", 1)
        .single();
      if (settingsError) throw Error("SETTINGS_UNAVAILABLE");
      return NextResponse.json(
        {
          ...data,
          qris: settings.value.qris,
          merchant: settings.value.merchant,
        },
        { headers: privateHeaders },
      );
    }
    if (
      typeof body.proof !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.proof)
    )
      return NextResponse.json(
        { error: "Unggah screenshot JPG, PNG, atau WebP maksimal 1,5 MB." },
        { status: 400, headers: privateHeaders },
      );
    const bytes = Buffer.from(body.proof.split(",")[1], "base64");
    if (bytes.length > 1_500_000)
      return NextResponse.json(
        { error: "Ukuran gambar maksimal 1,5 MB." },
        { status: 400, headers: privateHeaders },
      );
    let normalized: Buffer;
    try {
      const pipeline = sharp(bytes, {
        limitInputPixels: 20_000_000,
        animated: false,
      });
      const info = await pipeline.metadata();
      if (
        !["jpeg", "png", "webp"].includes(info.format || "") ||
        (info.pages || 1) > 1
      )
        throw Error("format");
      normalized = await pipeline
        .rotate()
        .resize({
          width: 1800,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88 })
        .toBuffer();
      if (normalized.length > 1_500_000) throw Error("size");
    } catch {
      return NextResponse.json(
        {
          error:
            "Gambar tidak dapat dibaca. Gunakan screenshot JPG/PNG/WebP yang lebih kecil.",
        },
        { status: 400, headers: privateHeaders },
      );
    }
    const { data, error } = await db.rpc("public_preorder_submit", {
      token_hash,
      image_base64: normalized.toString("base64"),
    });
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === "P0001"
              ? error.message
              : "Pengiriman belum terkonfirmasi. Coba ulang dengan sesi pesanan yang sama.",
        },
        { status: error.code === "P0001" ? 400 : 503, headers: privateHeaders },
      );
    return NextResponse.json(data, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      {
        error:
          "Pesanan belum terkonfirmasi. Periksa koneksi dan coba ulang; jangan membayar lagi.",
      },
      { status: 503, headers: privateHeaders },
    );
  }
}
