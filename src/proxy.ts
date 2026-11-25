import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  const isPrivateRoute =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/account") ||
    request.nextUrl.pathname === "/cart" ||
    request.nextUrl.pathname.startsWith("/checkout") ||
    request.nextUrl.pathname.startsWith("/order/") ||
    request.nextUrl.pathname.startsWith("/api/cart/") ||
    request.nextUrl.pathname.startsWith("/api/checkout/") ||
    request.nextUrl.pathname.startsWith("/auth/");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.startsWith("replace-with-")) {
    const response = NextResponse.next({ request });
    if (isPrivateRoute) setPrivateHeaders(response);
    return response;
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  await supabase.auth.getClaims();
  if (isPrivateRoute) setPrivateHeaders(response);
  return response;
}

function setPrivateHeaders(response: NextResponse): void {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/cart",
    "/checkout/:path*",
    "/order/:path*",
    "/api/cart/:path*",
    "/api/checkout/:path*",
    "/auth/:path*",
  ],
};
