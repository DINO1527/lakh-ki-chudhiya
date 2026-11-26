import type { PublicImage } from "@/features/products/domain/catalogue";
import type { ProductVariant } from "@/features/products/domain/product-variant";

export const CART_STORAGE_KEY = "lakh-ki-chudhiya-cart-v1";
export const CART_ITEM_LIMIT = 20;
export const CART_QUANTITY_LIMIT = 99;

export type CartItem = {
  variantId: string;
  quantity: number;
};

export type CartQuoteItem = {
  variant_id: string;
  product_id?: string;
  product_title: string;
  variant_label: string;
  set_count?: number;
  unit_price_minor: number;
  quantity: number;
  line_total_minor: number;
  quantity_available: boolean;
  product_preview?: CartProductPreview;
};

export type CartProductPreview = {
  slug: string;
  setCount: number;
  images: readonly PublicImage[];
  variants: readonly ProductVariant[];
};

export type CartQuote = {
  items: CartQuoteItem[];
  subtotal_minor: number;
  discount_minor?: number;
  delivery_fee_minor?: number;
  total_minor?: number;
  offer_id?: string | null;
  offer_name?: string | null;
  offer_discount_basis_points?: number | null;
  delivery_fee_configured?: boolean;
  cod_available?: boolean;
  online_payment_available?: false;
  whatsapp_configured?: boolean;
  all_available: boolean;
  quote_hash: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const quantities = new Map<string, number>();
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const variantId =
      typeof record.variantId === "string"
        ? record.variantId
        : typeof record.variant_id === "string"
          ? record.variant_id
          : "";
    const quantity = record.quantity;
    if (
      !UUID_PATTERN.test(variantId) ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity)
    ) {
      continue;
    }
    if (quantity < 1 || quantity > CART_QUANTITY_LIMIT) continue;

    const previous = quantities.get(variantId) ?? 0;
    quantities.set(variantId, Math.min(CART_QUANTITY_LIMIT, previous + quantity));
  }

  return [...quantities]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, CART_ITEM_LIMIT)
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function mergeCartItems(...sources: (readonly CartItem[])[]): CartItem[] {
  return normalizeCartItems(sources.flat());
}

export function replaceCartItem(
  items: readonly CartItem[],
  currentVariantId: string,
  nextVariantId: string,
  quantity: number,
): CartItem[] {
  if (
    !UUID_PATTERN.test(currentVariantId) ||
    !UUID_PATTERN.test(nextVariantId) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > CART_QUANTITY_LIMIT ||
    !items.some((item) => item.variantId === currentVariantId)
  ) {
    return normalizeCartItems(items);
  }

  return mergeCartItems(
    items.filter((item) => item.variantId !== currentVariantId),
    [{ variantId: nextVariantId, quantity }],
  );
}

/**
 * A signed-in cart in local storage is a cache of the server cart unless it has unsynced edits.
 * Only guest items are additive; summing the server and cached account snapshots doubles quantities
 * every time the customer signs in again.
 */
export function hydrateCustomerCart(
  serverItems: readonly CartItem[],
  cachedAccountItems: readonly CartItem[],
  guestItems: readonly CartItem[],
  hasUnsyncedAccountChanges: boolean,
): CartItem[] {
  const accountItems = hasUnsyncedAccountChanges ? cachedAccountItems : serverItems;
  return mergeCartItems(accountItems, guestItems);
}

export function calculateCartSubtotalMinor(
  items: readonly CartItem[],
  pricesByVariant: ReadonlyMap<string, number>,
): number | null {
  let subtotal = 0;
  for (const item of items) {
    const price = pricesByVariant.get(item.variantId);
    if (!Number.isSafeInteger(price) || price === undefined || price < 1) return null;
    subtotal += price * item.quantity;
    if (!Number.isSafeInteger(subtotal)) return null;
  }
  return subtotal;
}
