export function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  return (
    origin === expected &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
export async function readJson(
  request: Request,
  maxBytes = 2_200_000,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw Error("Gunakan JSON.");
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw Error("Data terlalu besar.");
  const reader = request.body?.getReader();
  if (!reader) throw Error("Request kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw Error("Data terlalu besar.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
