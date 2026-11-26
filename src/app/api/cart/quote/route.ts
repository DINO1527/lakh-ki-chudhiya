import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { jsonError, parseCartRequest } from "@/features/cart/server/request-validation";
import { getPublicProductsByIds } from "@/features/products/server/public-catalogue";

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

  const quote = data as Record<string, unknown>;
  const quoteItems = Array.isArray(quote.items) ? quote.items : [];
  const productIds = quoteItems.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const productId = (item as Record<string, unknown>).product_id;
    return typeof productId === "string" ? [productId] : [];
  });
  const productResult = await getPublicProductsByIds(productIds);
  const productsById = new Map(
    productResult.status === "ready"
      ? productResult.data.map((product) => [product.id, product])
      : [],
  );
  const itemsWithPreview = quoteItems.map((item) => {
    if (typeof item !== "object" || item === null) return item;
    const record = item as Record<string, unknown>;
    const product =
      typeof record.product_id === "string" ? productsById.get(record.product_id) : null;
    if (!product) return item;
    return {
      ...record,
      product_preview: {
        slug: product.slug,
        setCount: product.setCount,
        images: product.images,
        variants: product.variants,
      },
    };
  });

  return Response.json(
    { ...quote, items: itemsWithPreview },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
