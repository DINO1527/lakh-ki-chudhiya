"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, LoaderCircle, Ruler, ShoppingBag, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useCart } from "@/features/cart/components/cart-provider";
import { CART_ITEM_LIMIT, CART_QUANTITY_LIMIT } from "@/features/cart/domain/cart";
import { formatLkrPrice, formatVariantLabel, type ProductVariant } from "../domain/product-variant";

type VariantPickerProps = {
  variants: readonly ProductVariant[];
};

type ProductActionNotice = {
  kind: "success" | "error" | "loading";
  message: string;
};

export function VariantPicker({ variants }: VariantPickerProps) {
  const titleId = useId();
  const quantityId = useId();
  const { addItem, hydrated, items, syncsToAccount, syncState } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<ProductActionNotice | null>(null);
  const [awaitingAccountSync, setAwaitingAccountSync] = useState(false);
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId && variant.isAvailable,
  );
  const quantityIsValid =
    Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= CART_QUANTITY_LIMIT;
  const notice = awaitingAccountSync
    ? syncState === "saved"
      ? { kind: "success" as const, message: "Your bag is up to date." }
      : syncState === "error"
        ? {
            kind: "error" as const,
            message:
              "This item is saved on this device, but your account bag could not sync. Open your bag to try again.",
          }
        : { kind: "loading" as const, message: "Saving your bag to your account…" }
    : feedback;
  const noticeKind = notice?.kind;

  useEffect(() => {
    if (noticeKind !== "success" && noticeKind !== "error") return;
    const timeout = window.setTimeout(() => {
      if (awaitingAccountSync) setAwaitingAccountSync(false);
      else setFeedback(null);
    }, 6500);
    return () => window.clearTimeout(timeout);
  }, [awaitingAccountSync, noticeKind]);

  function addSelectedItem() {
    if (!selectedVariant || !quantityIsValid || !hydrated) return;
    const existing = items.find((item) => item.variantId === selectedVariant.id);
    if (!existing && items.length >= CART_ITEM_LIMIT) {
      setFeedback({
        kind: "error",
        message: `Your bag can contain up to ${CART_ITEM_LIMIT} different sizes. Remove an item before adding another.`,
      });
      return;
    }

    const addedQuantity = Math.min(quantity, CART_QUANTITY_LIMIT - (existing?.quantity ?? 0));
    if (addedQuantity < 1) {
      setFeedback({
        kind: "error",
        message: `Your bag already has the maximum ${CART_QUANTITY_LIMIT} sets for this size.`,
      });
      return;
    }

    try {
      setFeedback(null);
      setAwaitingAccountSync(syncsToAccount);
      addItem(selectedVariant.id, addedQuantity);
      if (!syncsToAccount) {
        setFeedback({
          kind: "success",
          message: `${addedQuantity} complete ${addedQuantity === 1 ? "set" : "sets"} added to your bag.`,
        });
      }
    } catch {
      setAwaitingAccountSync(false);
      setFeedback({ kind: "error", message: "We could not update your bag. Please try again." });
    }
  }

  return (
    <section aria-labelledby={titleId} className="variant-picker">
      <div className="variant-picker__heading">
        <div>
          <p className="eyebrow">Your perfect fit</p>
          <h2 className="variant-picker__title" id={titleId}>
            Choose a size
          </h2>
        </div>
        <Link className="variant-picker__size-guide" href="/size-guide">
          <Ruler aria-hidden="true" size={16} />
          <span>Size guide</span>
        </Link>
      </div>
      <ul className="variant-picker__list">
        {variants.map((variant) => {
          const selected = variant.id === selectedVariantId && variant.isAvailable;

          return (
            <li key={variant.id}>
              <button
                aria-pressed={selected}
                className="variant-option"
                disabled={!variant.isAvailable}
                onClick={() => {
                  setSelectedVariantId(variant.id);
                  setFeedback(null);
                }}
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
        <label className="admin-field cart-add-row__quantity" htmlFor={quantityId}>
          <span>Complete sets</span>
          <input
            aria-describedby={`${quantityId}-hint`}
            aria-invalid={!quantityIsValid}
            id={quantityId}
            max={CART_QUANTITY_LIMIT}
            min="1"
            onChange={(event) => {
              setQuantity(Number(event.target.value));
              setFeedback(null);
            }}
            step="1"
            type="number"
            value={quantity}
          />
        </label>
        <p
          className={`variant-picker__quantity-hint${quantityIsValid ? "" : " is-invalid"}`}
          id={`${quantityId}-hint`}
        >
          {quantityIsValid
            ? `Choose 1–${CART_QUANTITY_LIMIT} complete sets. Stock is confirmed again before order confirmation.`
            : `Enter a whole number from 1 to ${CART_QUANTITY_LIMIT}.`}
        </p>
        <button
          className="button button--primary variant-picker__submit"
          disabled={!selectedVariant || !quantityIsValid || !hydrated || notice?.kind === "loading"}
          onClick={addSelectedItem}
          type="button"
        >
          {!hydrated || notice?.kind === "loading" ? (
            <LoaderCircle aria-hidden="true" className="icon-spin" size={18} />
          ) : (
            <ShoppingBag aria-hidden="true" size={18} />
          )}
          <span>
            {!hydrated
              ? "Preparing your bag…"
              : notice?.kind === "loading"
                ? "Adding…"
                : "Add to bag"}
          </span>
        </button>
      </div>
      {notice ? (
        <div
          aria-live={notice.kind === "error" ? "assertive" : "polite"}
          className={`product-action-toast product-action-toast--${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.kind === "success" ? (
            <CheckCircle2 aria-hidden="true" size={20} />
          ) : notice.kind === "error" ? (
            <AlertCircle aria-hidden="true" size={20} />
          ) : (
            <LoaderCircle aria-hidden="true" className="icon-spin" size={20} />
          )}
          <p>{notice.message}</p>
          {notice.kind !== "loading" ? <Link href="/cart">View bag</Link> : null}
          <button
            aria-label="Dismiss message"
            onClick={() => {
              if (awaitingAccountSync) setAwaitingAccountSync(false);
              else setFeedback(null);
            }}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
