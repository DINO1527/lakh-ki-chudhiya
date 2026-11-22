import { normalizeCartItems, type CartItem } from "../domain/cart";

export function parseCartRequest(value: unknown): CartItem[] | null {
  if (typeof value !== "object" || value === null) return null;
  const items = (value as Record<string, unknown>).items;
  if (!Array.isArray(items) || items.length > 20) return null;
  const normalized = normalizeCartItems(items);
  if (normalized.length !== items.length) return null;
  return normalized;
}

export function jsonError(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
