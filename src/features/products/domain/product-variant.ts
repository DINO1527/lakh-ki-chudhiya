export type ProductVariant = {
  id: string;
  sizeCode: string | null;
  innerDiameterMm: number | null;
  priceMinor: number;
  isAvailable: boolean;
};

export type VariantSelection = {
  sizeCode: string | null;
};

export function resolveAvailableVariant(
  variants: readonly ProductVariant[],
  selection: VariantSelection,
): ProductVariant | null {
  return (
    variants.find((variant) => variant.sizeCode === selection.sizeCode && variant.isAvailable) ??
    null
  );
}

export function formatLkrPrice(priceMinor: number): string {
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) {
    throw new RangeError("Price must be a non-negative integer in minor units.");
  }

  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceMinor / 100);
}

export function formatVariantLabel(variant: ProductVariant): string {
  return variant.sizeCode ? `Size ${variant.sizeCode}` : "One size";
}
