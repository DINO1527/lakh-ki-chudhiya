import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { jsonError, parseCartRequest } from "@/features/cart/server/request-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
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
  if (!items || items.length === 0) return jsonError("Cart items are invalid.", 400);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("quote_cart", {
    p_items: items.map(({ variantId, quantity }) => ({ variant_id: variantId, quantity })),
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Cart prices could not be refreshed.", 422);
  }

  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
