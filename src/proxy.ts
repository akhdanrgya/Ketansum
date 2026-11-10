import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  // Demo bypass is restricted to development, never production builds.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  )
    return NextResponse.next();
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    if (request.nextUrl.pathname.startsWith("/admin"))
      return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  if (request.nextUrl.pathname.startsWith("/api/auth/")) return response;
  const secure = process.env.APP_ORIGIN
    ? process.env.APP_ORIGIN.startsWith("https://")
    : request.nextUrl.protocol === "https:";
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: { httpOnly: true, sameSite: "lax", secure, path: "/" },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          response.headers.set("Cache-Control", "private, no-store, max-age=0");
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure,
              path: "/",
            }),
          );
        },
      },
    },
  );
  try {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (request.nextUrl.pathname.startsWith("/admin") && !user) {
      const redirect = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      redirect.headers.set("Cache-Control", "no-store");
      return redirect;
    }
  } catch {
    if (request.nextUrl.pathname.startsWith("/admin"))
      return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}
export const config = { matcher: ["/admin/:path*", "/api/:path*", "/login"] };
