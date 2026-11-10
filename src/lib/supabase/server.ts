import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
export async function createClient() {
  const store = await cookies();
  const requestHeaders = await headers();
  const secure = process.env.APP_ORIGIN
    ? process.env.APP_ORIGIN.startsWith("https://")
    : requestHeaders.get("x-forwarded-proto") === "https";
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { httpOnly: true, sameSite: "lax", secure, path: "/" },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              store.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure,
                path: "/",
              }),
            );
          } catch {
            /* Route handlers and proxy perform cookie writes; Server Components only read. */
          }
        },
      },
    },
  );
}
