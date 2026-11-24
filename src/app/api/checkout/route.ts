import { cookies } from "next/headers";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  isSameOriginMutation,
  jsonError,
  parseCartRequest,
} from "@/features/cart/server/request-validation";
import {
  GUEST_ORDER_ACCESS_COOKIE,
  hashGuestOrderAccessToken,
} from "@/features/orders/server/guest-access";
import type { CartQuote } from "@/features/cart/domain/cart";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  items: unknown;
  idempotencyKey: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryNote: string;
  paymentMethod: "manual" | "cod";
  confirmedSubtotalMinor: number;
  confirmedQuoteHash: string;
};

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403);
  if (!isSupabaseServerConfigured()) return jsonError("Checkout service is unavailable.", 503);
  if (Number(request.headers.get("content-length") ?? 0) > 32_768) {
    return jsonError("Checkout request is too large.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Checkout request is invalid.", 400);
  }
  if (!isCheckoutBody(body)) return jsonError("Contact or delivery details are incomplete.", 400);

  const items = parseCartRequest(body);
  if (!items || items.length === 0) return jsonError("Cart items are invalid.", 400);

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && userError.name !== "AuthSessionMissingError") {
    return jsonError("Your sign-in could not be verified.", 401);
  }

  let guestAccessHash: string | null = null;
  if (!userData.user) {
    const token = (await cookies()).get(GUEST_ORDER_ACCESS_COOKIE)?.value;
    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
      return jsonError("Refresh checkout and try again.", 401);
    }
    guestAccessHash = await hashGuestOrderAccessToken(token);
  }

  const itemPayload = items.map(({ variantId, quantity }) => ({
    variant_id: variantId,
    quantity,
  }));
  const { data, error } = await supabase.rpc("create_order_with_quote", {
    p_items: itemPayload,
    p_idempotency_key: body.idempotencyKey,
    p_customer_name: body.customerName.trim(),
    p_customer_email: body.customerEmail.trim().toLowerCase(),
    p_customer_phone: body.customerPhone.trim(),
    p_delivery_address: body.deliveryAddress.trim(),
    p_delivery_city: body.deliveryCity.trim(),
    p_delivery_postal_code: body.deliveryPostalCode.trim(),
    p_delivery_note: body.deliveryNote.trim(),
    p_confirmed_subtotal_minor: body.confirmedSubtotalMinor,
    p_confirmed_quote_hash: body.confirmedQuoteHash,
    p_guest_access_hash: guestAccessHash,
    p_payment_method: body.paymentMethod,
  });

  if (error) {
    if (error.code === "P0001") {
      const { data: quoteData } = await supabase.rpc("quote_cart", { p_items: itemPayload });
      return Response.json(
        { error: "price_changed", quote: asCartQuote(quoteData) },
        { status: 409, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (error.code === "23514")
      return jsonError("Stock changed. Review your cart and try again.", 409);
    if (error.code === "22023" || error.code === "P0002") {
      return jsonError("Some order details or selected items are no longer valid.", 400);
    }
    return jsonError("Your order could not be saved. Please retry from the cart.", 422);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError(
      "Your order could not be confirmed as saved. Check your order history before retrying.",
      502,
    );
  }
  const result = data as Record<string, unknown>;
  if (typeof result.id !== "string" || typeof result.reference !== "string") {
    return jsonError(
      "Your order could not be confirmed as saved. Check your order history before retrying.",
      502,
    );
  }

  return Response.json(
    { id: result.id, reference: result.reference, replayed: result.replayed === true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

function isCheckoutBody(value: unknown): value is CheckoutBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  const stringFields = [
    "idempotencyKey",
    "customerName",
    "customerEmail",
    "customerPhone",
    "deliveryAddress",
    "deliveryCity",
    "deliveryPostalCode",
    "deliveryNote",
  ] as const;
  if (stringFields.some((field) => typeof body[field] !== "string")) return false;
  return (
    typeof body.confirmedSubtotalMinor === "number" &&
    Number.isSafeInteger(body.confirmedSubtotalMinor) &&
    body.confirmedSubtotalMinor > 0 &&
    typeof body.confirmedQuoteHash === "string" &&
    /^[0-9a-f]{32}$/.test(body.confirmedQuoteHash) &&
    typeof body.idempotencyKey === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.idempotencyKey,
    ) &&
    (body.customerName as string).length <= 120 &&
    (body.customerEmail as string).length <= 254 &&
    (body.customerPhone as string).length <= 40 &&
    (body.deliveryAddress as string).length <= 300 &&
    (body.deliveryCity as string).length <= 100 &&
    (body.deliveryPostalCode as string).length <= 24 &&
    (body.deliveryNote as string).length <= 500 &&
    (body.paymentMethod === "manual" || body.paymentMethod === "cod")
  );
}

function asCartQuote(value: unknown): CartQuote | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const quote = value as Partial<CartQuote>;
  if (
    !Array.isArray(quote.items) ||
    typeof quote.subtotal_minor !== "number" ||
    typeof quote.all_available !== "boolean" ||
    typeof quote.quote_hash !== "string" ||
    !/^[0-9a-f]{32}$/.test(quote.quote_hash)
  ) {
    return null;
  }
  return quote as CartQuote;
}
