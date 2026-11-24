"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CART_ITEM_LIMIT, CART_QUANTITY_LIMIT } from "../domain/cart";
import Image from "next/image";
import type { PublicImage } from "@/features/products/domain/catalogue";
import { useCart } from "./cart-provider";
import {
  formatLkrPrice,
  formatVariantLabel,
  type ProductVariant,
} from "@/features/products/domain/product-variant";

export type SelectableProduct = {
  slug: string;
  title: string;
  setCount: number;
  isUatFixture: boolean;
  image: PublicImage | null;
  variants: readonly ProductVariant[];
};

type ProductSelectionDialogProps = {
  product: SelectableProduct;
  mode?: "add" | "edit";
  currentVariantId?: string;
  initialQuantity?: number;
};

export function ProductSelectionDialog({
  product,
  mode = "add",
  currentVariantId,
  initialQuantity = 1,
}: ProductSelectionDialogProps) {
  const titleId = useId();
  const sizeGroupId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addItem, items, replaceItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(currentVariantId ?? "");
  const [quantity, setQuantity] = useState(initialQuantity);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVariantId(currentVariantId ?? "");
    setQuantity(initialQuantity);
  }, [currentVariantId, initialQuantity, isOpen]);

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const existingTargetQuantity =
    items.find(
      (item) => item.variantId === selectedVariantId && item.variantId !== currentVariantId,
    )?.quantity ?? 0;
  const maxQuantity = CART_QUANTITY_LIMIT - existingTargetQuantity;
  const canAddAnotherVariant =
    mode === "edit" ||
    items.some((item) => item.variantId === selectedVariantId) ||
    items.length < CART_ITEM_LIMIT;
  const canSave =
    Boolean(selectedVariant?.isAvailable) &&
    !product.isUatFixture &&
    Number.isSafeInteger(quantity) &&
    quantity >= 1 &&
    quantity <= maxQuantity &&
    canAddAnotherVariant;

  function saveSelection() {
    if (!selectedVariant || !canSave) return;
    if (mode === "edit" && currentVariantId) {
      replaceItem(currentVariantId, selectedVariant.id, quantity);
      setNotice(`${product.title} selection updated.`);
    } else {
      addItem(selectedVariant.id, quantity);
      setNotice(`${quantity} complete ${quantity === 1 ? "set" : "sets"} added to your bag.`);
    }
    setIsOpen(false);
  }

  return (
    <>
      <button
        className={
          mode === "edit"
            ? "cart-item__edit button button--quiet"
            : "product-card__action button button--primary"
        }
        onClick={() => {
          setNotice("");
          setIsOpen(true);
        }}
        type="button"
      >
        {mode === "edit" ? "Edit size and quantity" : "Choose size"}
      </button>
      <p aria-live="polite" className="selection-dialog__notice" role="status">
        {notice}
      </p>
      <dialog
        aria-labelledby={titleId}
        className="selection-dialog"
        onCancel={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setIsOpen(false);
        }}
        ref={dialogRef}
      >
        <div className="selection-dialog__surface">
          <header className="selection-dialog__header">
            {product.image ? (
              <Image
                alt=""
                className="selection-dialog__image"
                height={192}
                src={product.image.url}
                unoptimized
                width={192}
              />
            ) : (
              <span aria-hidden="true" className="selection-dialog__image-placeholder">
                L
              </span>
            )}
            <div>
              <p className="eyebrow">A complete bangle set</p>
              <h2 id={titleId}>{mode === "edit" ? "Edit your selection" : "Choose your size"}</h2>
              <p className="selection-dialog__product-title">{product.title}</p>
            </div>
            <button
              aria-label="Close size selection"
              className="selection-dialog__close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>

          <p className="selection-dialog__set-note">
            Sold as a set of {product.setCount} bangles. Choose one size; every set in this listing
            is the same size.
          </p>

          <fieldset className="selection-dialog__sizes">
            <legend id={sizeGroupId}>Size</legend>
            {product.variants.map((variant) => {
              const isCurrentUnavailable = variant.id === currentVariantId && !variant.isAvailable;
              return (
                <label
                  className="selection-dialog__size"
                  data-selected={selectedVariantId === variant.id ? "true" : undefined}
                  key={variant.id}
                >
                  <input
                    checked={selectedVariantId === variant.id}
                    disabled={!variant.isAvailable && !isCurrentUnavailable}
                    name={`size-${sizeGroupId}`}
                    onChange={() => setSelectedVariantId(variant.id)}
                    type="radio"
                    value={variant.id}
                  />
                  <span className="selection-dialog__size-copy">
                    <strong>{formatVariantLabel(variant)}</strong>
                    {!variant.isAvailable && <small>Currently unavailable</small>}
                    {isCurrentUnavailable && <small>Choose another available size</small>}
                  </span>
                  <span className="selection-dialog__price">
                    {formatLkrPrice(variant.priceMinor)}
                  </span>
                </label>
              );
            })}
          </fieldset>

          {selectedVariant && (
            <p aria-live="polite" className="selection-dialog__selected" role="status">
              {formatVariantLabel(selectedVariant)} · {formatLkrPrice(selectedVariant.priceMinor)}{" "}
              per complete set
            </p>
          )}

          <label className="selection-dialog__quantity" htmlFor={`quantity-${sizeGroupId}`}>
            <span>Complete sets</span>
            <input
              id={`quantity-${sizeGroupId}`}
              max={maxQuantity}
              min={1}
              onChange={(event) => setQuantity(Number(event.target.value))}
              type="number"
              value={quantity}
            />
          </label>
          {maxQuantity < CART_QUANTITY_LIMIT && (
            <p className="field-hint">
              This change will combine with the {existingTargetQuantity} set
              {existingTargetQuantity === 1 ? "" : "s"} already in your bag for this size.
            </p>
          )}
          {product.isUatFixture && (
            <p className="fixture-notice" role="note">
              This is a testing example and cannot be purchased.
            </p>
          )}
          {!canAddAnotherVariant && (
            <p className="form-message form-message--error" role="alert">
              Your bag can contain up to {CART_ITEM_LIMIT} different sizes. Remove a line before
              adding another.
            </p>
          )}
          {quantity > maxQuantity && (
            <p className="form-message form-message--error" role="alert">
              Your bag already has the maximum number of sets for this size.
            </p>
          )}

          <p className="selection-dialog__stock-note">
            Availability and current prices are checked again in your bag. Adding this set does not
            reserve stock.
          </p>
          <footer className="selection-dialog__actions">
            <button className="button button--quiet" onClick={() => setIsOpen(false)} type="button">
              Keep browsing
            </button>
            <button
              className="button button--primary"
              disabled={!canSave}
              onClick={saveSelection}
              type="button"
            >
              {mode === "edit" ? "Save selection" : "Add set to bag"}
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
