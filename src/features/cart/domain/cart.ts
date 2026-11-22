export const CART_STORAGE_KEY = "lakh-ki-chudhiya-cart-v1";
export const CART_ITEM_LIMIT = 20;
export const CART_QUANTITY_LIMIT = 99;

export type CartItem = {
  variantId: string;
  quantity: number;
};

export type CartQuoteItem = {
  variant_id: string;
  product_title: string;
  variant_label: string;
  unit_price_minor: number;
  quantity: number;
  line_total_minor: number;
  quantity_available: boolean;
};

export type CartQuote = {
  items: CartQuoteItem[];
  subtotal_minor: number;
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
