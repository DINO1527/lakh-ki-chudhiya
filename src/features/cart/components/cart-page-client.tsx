"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import type { CartQuote } from "../domain/cart";
import { useCart } from "./cart-provider";

export function CartPageClient() {
  const { items, hydrated, syncState, setQuantity, removeItem } = useCart();
  const itemsKey = JSON.stringify(items);
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [quoteState, setQuoteState] = useState<{
    key: string;
    quote?: CartQuote;
    error?: string;
  } | null>(null);
  const currentQuoteState = quoteState?.key === itemsKey ? quoteState : null;
  const quote = currentQuoteState?.quote ?? null;
  const quoteError = currentQuoteState?.error ?? null;

  useEffect(() => {
    if (!hydrated || items.length === 0) return;

    const controller = new AbortController();
    void fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Prices or availability could not be refreshed.");
        return (await response.json()) as CartQuote;
      })
      .then((nextQuote) => {
        setQuoteState({ key: itemsKey, quote: nextQuote });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setQuoteState({
            key: itemsKey,
            error: error instanceof Error ? error.message : "Cart could not be refreshed.",
          });
        }
      });

    return () => controller.abort();
  }, [hydrated, items, itemsKey, refreshAttempt]);

  if (!hydrated) {
    return <p role="status">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <section className="cart-empty">
        <h2>Your cart is empty</h2>
        <p>Choose a size from a published design to begin.</p>
        <Link className="button button--primary" href="/shop">
          Browse bangles
        </Link>
      </section>
    );
  }

  const quoteByVariant = new Map((quote?.items ?? []).map((item) => [item.variant_id, item]));
  const unavailable = quote !== null && !quote.all_available;

  return (
    <div className="cart-layout">
      <section aria-label="Cart items" className="cart-list">
        {items.map((item) => {
          const quotedItem = quoteByVariant.get(item.variantId);
          return (
            <article className="cart-item" key={item.variantId}>
              <div className="cart-item__details">
                <h2>{quotedItem?.product_title ?? "Refreshing item details…"}</h2>
                <p>{quotedItem?.variant_label ?? "Selected size"}</p>
                {quotedItem && (
                  <p className="cart-item__price">
                    {formatLkrPrice(quotedItem.unit_price_minor)} per complete set
                    {quotedItem.set_count ? ` of ${quotedItem.set_count} bangles` : ""}
                  </p>
                )}
                {quotedItem && !quotedItem.quantity_available && (
                  <p className="form-message form-message--error" role="status">
                    This quantity is not currently available. Reduce it or remove this item.
                  </p>
                )}
              </div>
              <label className="cart-item__quantity">
                Complete sets
                <input
                  aria-label={`Quantity for ${quotedItem?.product_title ?? "cart item"}`}
                  max={99}
                  min={1}
                  onChange={(event) =>
                    setQuantity(
                      item.variantId,
                      Math.min(99, Math.max(1, Number(event.target.value))),
                    )
                  }
                  type="number"
                  value={item.quantity}
                />
              </label>
              <div className="cart-item__total">
                {quotedItem ? formatLkrPrice(quotedItem.line_total_minor) : "—"}
              </div>
              <button
                className="text-button"
                onClick={() => removeItem(item.variantId)}
                type="button"
              >
                Remove
              </button>
            </article>
          );
        })}
        <p aria-live="polite" className="cart-sync-status" role="status">
          {syncState === "saving" && "Saving your account cart…"}
          {syncState === "saved" && "Account cart saved."}
          {syncState === "error" &&
            "Account cart is saved on this device; cloud sync needs attention."}
        </p>
      </section>

      <aside aria-labelledby="cart-summary-title" className="cart-summary">
        <h2 id="cart-summary-title">Order estimate</h2>
        {quoteError && (
          <p className="form-message form-message--error" role="alert">
            {quoteError}
          </p>
        )}
        <div className="cart-summary__line">
          <span>Items subtotal</span>
          <strong>{quote ? formatLkrPrice(quote.subtotal_minor) : "Refreshing…"}</strong>
        </div>
        <div className="cart-summary__line">
          <span>Delivery</span>
          <strong>
            {quote?.delivery_fee_configured === false
              ? "Not configured"
              : quote?.delivery_fee_minor === undefined
                ? "Refreshing…"
                : quote.delivery_fee_minor === 0
                  ? "Free"
                  : formatLkrPrice(quote.delivery_fee_minor)}
          </strong>
        </div>
        {quote?.discount_minor ? (
          <div className="cart-summary__line">
            <span>{quote.offer_name ?? "Offer"}</span>
            <strong>−{formatLkrPrice(quote.discount_minor)}</strong>
          </div>
        ) : null}
        <div className="cart-summary__line cart-summary__line--total">
          <span>Estimated total</span>
          <strong>
            {quote?.total_minor === undefined ? "—" : formatLkrPrice(quote.total_minor)}
          </strong>
        </div>
        <p className="cart-summary__note">
          Adding items does not reserve stock. Staff confirm availability and delivery before
          fulfilment.
        </p>
        {unavailable && (
          <p className="form-message form-message--error" role="alert">
            Update quantities before continuing. Stock may change until staff confirms an order.
          </p>
        )}
        {quote && quote.all_available && !quoteError ? (
          <Link className="button button--primary" href="/checkout">
            Continue to checkout
          </Link>
        ) : quoteError ? (
          <button
            className="button button--primary"
            onClick={() => setRefreshAttempt((attempt) => attempt + 1)}
            type="button"
          >
            Retry price check
          </button>
        ) : (
          <button className="button button--primary" disabled type="button">
            {unavailable ? "Update unavailable items" : "Refreshing prices…"}
          </button>
        )}
      </aside>
    </div>
  );
}
