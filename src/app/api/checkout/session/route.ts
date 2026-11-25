import { cookies } from "next/headers";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  createGuestOrderAccessToken,
  GUEST_ORDER_ACCESS_COOKIE,
  GUEST_ORDER_ACCESS_MAX_AGE,
} from "@/features/orders/server/guest-access";
import { isSameOriginMutation } from "@/features/cart/server/request-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!isSupabaseServerConfigured()) {
    return Response.json({ error: "Checkout service is unavailable." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return Response.json({ guest: false }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_ORDER_ACCESS_COOKIE)?.value;
  const response = Response.json(
    { guest: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    token = createGuestOrderAccessToken();
    response.headers.append(
      "Set-Cookie",
      `${GUEST_ORDER_ACCESS_COOKIE}=${token}; Path=/; Max-Age=${GUEST_ORDER_ACCESS_MAX_AGE}; HttpOnly; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
  }
  return response;
}
