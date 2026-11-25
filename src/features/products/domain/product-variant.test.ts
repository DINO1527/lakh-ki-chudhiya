import { describe, expect, it } from "vitest";
import { formatLkrPrice, resolveAvailableVariant, type ProductVariant } from "./product-variant";

const variants: readonly ProductVariant[] = [
  {
    id: "test-variant-a",
    sizeCode: "2-4",
    innerDiameterMm: null,
    priceMinor: 125000,
    isAvailable: true,
  },
  {
    id: "test-variant-b",
    sizeCode: "2-6",
    innerDiameterMm: null,
    priceMinor: 135000,
    isAvailable: false,
  },
];

describe("resolveAvailableVariant", () => {
  it("returns the available SKU for the selected size", () => {
    expect(resolveAvailableVariant(variants, { sizeCode: "2-4" })?.id).toBe("test-variant-a");
  });

  it("does not fall back to another size or select an unavailable variant", () => {
    expect(
      resolveAvailableVariant(variants, {
        sizeCode: "2-8",
      }),
    ).toBeNull();
    expect(
      resolveAvailableVariant(variants, {
        sizeCode: "2-6",
      }),
    ).toBeNull();
  });
});

describe("formatLkrPrice", () => {
  it("formats integer minor units as LKR", () => {
    expect(formatLkrPrice(125000)).toContain("1,250.00");
  });

  it.each([-1, 1.5, Number.NaN])("rejects invalid minor-unit amount %s", (amount) => {
    expect(() => formatLkrPrice(amount)).toThrow(RangeError);
  });
});
