"use client";

import { useId, useState } from "react";
import { formatLkrPrice, formatVariantLabel, type ProductVariant } from "../domain/product-variant";

type VariantPickerProps = {
  variants: readonly ProductVariant[];
  isUatFixture?: boolean;
};

export function VariantPicker({ variants, isUatFixture = false }: VariantPickerProps) {
  const titleId = useId();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
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
    </section>
  );
}
