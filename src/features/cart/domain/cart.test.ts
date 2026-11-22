import { describe, expect, it } from "vitest";
import { calculateCartSubtotalMinor, mergeCartItems, normalizeCartItems } from "./cart";

const variantA = "11111111-1111-4111-8111-111111111111";
const variantB = "22222222-2222-4222-8222-222222222222";

describe("cart domain", () => {
  it("drops malformed, unsafe, and out-of-range local items", () => {
    expect(
      normalizeCartItems([
        { variantId: variantA, quantity: 2 },
        { variantId: "not-a-uuid", quantity: 1 },
        { variantId: variantB, quantity: 0 },
        { variantId: variantB, quantity: 100 },
        { variantId: variantB, quantity: 1.5 },
      ]),
    ).toEqual([{ variantId: variantA, quantity: 2 }]);
  });

  it("merges duplicate variants deterministically and caps quantities", () => {
    expect(
      mergeCartItems(
        [{ variantId: variantA, quantity: 80 }],
        [
          { variantId: variantA, quantity: 30 },
          { variantId: variantB, quantity: 1 },
        ],
      ),
    ).toEqual([
      { variantId: variantA, quantity: 99 },
      { variantId: variantB, quantity: 1 },
    ]);
  });

  it("uses only server-quoted integer prices for subtotal calculations", () => {
    expect(
      calculateCartSubtotalMinor(
        [
          { variantId: variantA, quantity: 2 },
          { variantId: variantB, quantity: 1 },
        ],
        new Map([
          [variantA, 1_250],
          [variantB, 2_500],
        ]),
      ),
    ).toBe(5_000);
    expect(
      calculateCartSubtotalMinor(
        [{ variantId: variantA, quantity: 1 }],
        new Map([[variantA, Number.NaN]]),
      ),
    ).toBeNull();
  });
});
