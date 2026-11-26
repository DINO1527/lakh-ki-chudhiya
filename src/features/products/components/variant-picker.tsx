"use client";

import { useId, useState } from "react";
import { useCart } from "@/features/cart/components/cart-provider";
import { CART_ITEM_LIMIT, CART_QUANTITY_LIMIT } from "@/features/cart/domain/cart";
import { formatLkrPrice, formatVariantLabel, type ProductVariant } from "../domain/product-variant";

type VariantPickerProps = {
  variants: readonly ProductVariant[];
};

export function VariantPicker({ variants }: VariantPickerProps) {
  const titleId = useId();
  const { addItem, items } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId && variant.isAvailable,
  );

  return (
    <section aria-labelledby={titleId} className="variant-picker">
      <h2 className="variant-picker__title" id={titleId}>
        Choose size
      </h2>
      <ul className="variant-picker__list">
        {variants.map((variant) => {
          const selected = variant.id === selectedVariantId && variant.isAvailable;

          return (
            <li key={variant.id}>
              <button
                aria-pressed={selected}
                className="variant-option"
                disabled={!variant.isAvailable}
                onClick={() => setSelectedVariantId(variant.id)}
                type="button"
              >
                <span className="variant-option__label">{formatVariantLabel(variant)}</span>
                <span className="variant-option__price">{formatLkrPrice(variant.priceMinor)}</span>
                {!variant.isAvailable && (
                  <span className="variant-option__availability">Out of stock</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="variant-picker__selection">
        {selectedVariant
          ? `${formatVariantLabel(selectedVariant)} · ${formatLkrPrice(selectedVariant.priceMinor)}`
          : "Select an available size to see its price."}
      </p>
      <div className="cart-add-row">
        <label className="admin-field cart-add-row__quantity">
          <span>Complete sets</span>
          <input
            max={CART_QUANTITY_LIMIT}
            min="1"
            onChange={(event) => setQuantity(Number(event.target.value))}
            step="1"
            type="number"
            value={quantity}
          />
        </label>
        <button
          className="button button--primary"
          disabled={
            !selectedVariant ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > CART_QUANTITY_LIMIT
          }
          onClick={() => {
            if (!selectedVariant) return;
            const existing = items.find((item) => item.variantId === selectedVariant.id);
            if (!existing && items.length >= CART_ITEM_LIMIT) {
              setNotice(`Your cart is limited to ${CART_ITEM_LIMIT} different sizes.`);
              return;
            }
            const addedQuantity = Math.min(
              quantity,
              CART_QUANTITY_LIMIT - (existing?.quantity ?? 0),
            );
            if (addedQuantity < 1) {
              setNotice(
                `Your cart already has the maximum ${CART_QUANTITY_LIMIT} sets for this size.`,
              );
              return;
            }
            addItem(selectedVariant.id, addedQuantity);
            setNotice(
              `${addedQuantity} complete ${addedQuantity === 1 ? "set" : "sets"} added to your cart.`,
            );
          }}
          type="button"
        >
          Add to cart
        </button>
      </div>
      <p aria-live="polite" className="cart-add-notice" role="status">
        {notice}
      </p>
    </section>
  );
}
