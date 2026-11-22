"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useCart } from "@/features/cart/components/cart-provider";
import { formatLkrPrice, formatVariantLabel, type ProductVariant } from "../domain/product-variant";

type VariantPickerProps = {
  variants: readonly ProductVariant[];
  isUatFixture?: boolean;
};

export function VariantPicker({ variants, isUatFixture = false }: VariantPickerProps) {
  const titleId = useId();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState("");
  const { addItem } = useCart();
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId && variant.isAvailable,
  );

  return (
    <section aria-labelledby={titleId} className="variant-picker">
      <h2 className="variant-picker__title" id={titleId}>
        Choose size and colour
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
                <span className="variant-option__price">
                  {isUatFixture ? "Test price · " : ""}
                  {formatLkrPrice(variant.priceMinor)}
                </span>
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
          ? `${formatVariantLabel(selectedVariant)} · ${isUatFixture ? "test price " : ""}${formatLkrPrice(selectedVariant.priceMinor)}`
          : "Select an available option to see your selection."}
      </p>
      <button
        className="button button--primary variant-picker__add"
        disabled={!selectedVariant}
        onClick={() => {
          if (!selectedVariant) return;
          addItem(selectedVariant.id);
          setCartMessage(`${formatVariantLabel(selectedVariant)} added to your cart.`);
        }}
        type="button"
      >
        Add to cart
      </button>
      {cartMessage && (
        <p aria-live="polite" className="variant-picker__cart-message" role="status">
          {cartMessage} <Link href="/cart">View cart</Link>
        </p>
      )}
    </section>
  );
}
