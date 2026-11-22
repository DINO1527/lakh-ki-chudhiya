import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  isSameOriginMutation,
  jsonError,
  parseCartRequest,
} from "@/features/cart/server/request-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403);
  if (!isSupabaseServerConfigured()) return jsonError("Cart service is unavailable.", 503);
  if (Number(request.headers.get("content-length") ?? 0) > 32_768) {
    return jsonError("Cart request is too large.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Cart request is invalid.", 400);
  }

  const items = parseCartRequest(body);
  if (!items) return jsonError("Cart items are invalid.", 400);

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return jsonError("Sign in to save your cart.", 401);

  const { error } = await supabase.rpc("replace_customer_cart", {
    p_items: items.map(({ variantId, quantity }) => ({ variant_id: variantId, quantity })),
  });
  if (error) return jsonError("Your cart could not be saved.", 422);

  return Response.json({ saved: true }, { headers: { "Cache-Control": "private, no-store" } });
}
