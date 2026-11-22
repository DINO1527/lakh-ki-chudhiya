import "server-only";

export const GUEST_ORDER_ACCESS_COOKIE = "lakh_guest_order_access";
export const GUEST_ORDER_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

export function createGuestOrderAccessToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function hashGuestOrderAccessToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
