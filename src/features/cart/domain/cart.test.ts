import { describe, expect, it } from "vitest";
import {
  calculateCartSubtotalMinor,
  hydrateCustomerCart,
  mergeCartItems,
  normalizeCartItems,
  replaceCartItem,
} from "./cart";

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

  it("replaces a cart selection and merges its quantity into an existing size", () => {
    expect(
      replaceCartItem(
        [
          { variantId: variantA, quantity: 2 },
          { variantId: variantB, quantity: 3 },
        ],
        variantA,
        variantB,
        4,
      ),
    ).toEqual([{ variantId: variantB, quantity: 7 }]);
  });

  it("keeps the existing cart unchanged when an edit is invalid", () => {
    const items = [{ variantId: variantA, quantity: 2 }];
    expect(replaceCartItem(items, variantA, variantB, 0)).toEqual(items);
    expect(replaceCartItem(items, variantB, variantA, 1)).toEqual(items);
  });

  it("does not add a synced local account-cart cache to its server copy", () => {
    expect(
      hydrateCustomerCart(
        [{ variantId: variantA, quantity: 2 }],
        [{ variantId: variantA, quantity: 2 }],
        [],
        false,
      ),
    ).toEqual([{ variantId: variantA, quantity: 2 }]);
  });

  it("keeps unsynced account edits and additively merges the guest cart", () => {
    expect(
      hydrateCustomerCart(
        [{ variantId: variantA, quantity: 2 }],
        [{ variantId: variantA, quantity: 3 }],
        [
          { variantId: variantA, quantity: 1 },
          { variantId: variantB, quantity: 1 },
        ],
        true,
      ),
    ).toEqual([
      { variantId: variantA, quantity: 4 },
      { variantId: variantB, quantity: 1 },
    ]);
  });

  it("uses the server cart when the local account cache has no pending edits", () => {
    expect(
      hydrateCustomerCart(
        [{ variantId: variantA, quantity: 3 }],
        [{ variantId: variantA, quantity: 1 }],
        [],
        false,
      ),
    ).toEqual([{ variantId: variantA, quantity: 3 }]);
  });

  it("keeps an unsynced local removal instead of restoring it from the server", () => {
    expect(hydrateCustomerCart([{ variantId: variantA, quantity: 1 }], [], [], true)).toEqual([]);
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
