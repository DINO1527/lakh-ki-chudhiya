import type { StaffRole } from "./access";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_INTEGER_PRICE_MINOR = 2_147_483_647;

export function formText(formData: FormData, name: string, maxLength: number): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim();
  return normalized.length <= maxLength ? normalized : null;
}

export function productSlug(formData: FormData): string | null {
  const entered = formText(formData, "slug", 100);
  if (entered === null) return null;
  const title = formText(formData, "title", 160);
  const slug = (entered || title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return SLUG_PATTERN.test(slug) ? slug : null;
}

export function validUuid(value: string | null): value is string {
  return value !== null && UUID_PATTERN.test(value);
}

export function validEmail(value: string | null): value is string {
  return value !== null && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function positiveInteger(value: string | null, max = 2_147_483_647): number | null {
  if (!value || !/^[0-9]{1,10}$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= max ? number : null;
}

export function integer(value: string | null): number | null {
  if (!value || !/^-?[0-9]{1,10}$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= -2_147_483_648 && number <= 2_147_483_647
    ? number
    : null;
}

export function lkrToMinor(value: string | null, allowBlank = false): number | null {
  if (allowBlank && value?.trim() === "") return 0;
  if (!value || !/^[0-9]{1,8}(?:\.[0-9]{1,2})?$/.test(value.trim())) return null;
  const [wholePart, fractionPart = ""] = value.trim().split(".");
  const minor = Number(wholePart) * 100 + Number(fractionPart.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor <= MAX_INTEGER_PRICE_MINOR ? minor : null;
}

export function validRole(value: string | null): value is StaffRole {
  return value === "owner" || value === "staff";
}
