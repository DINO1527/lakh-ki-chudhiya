"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "@/features/cart/components/cart-provider";
import type { CartQuote } from "@/features/cart/domain/cart";
import { formatLkrPrice } from "@/features/products/domain/product-variant";

type CheckoutValues = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryNote: string;
};

const EMPTY_VALUES: CheckoutValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  deliveryAddress: "",
  deliveryCity: "",
  deliveryPostalCode: "",
  deliveryNote: "",
};

export function CheckoutForm({ isSignedIn }: { isSignedIn: boolean }) {
  const { items, hydrated, clearCart } = useCart();
  const router = useRouter();
  const itemsKey = JSON.stringify(items);
  const [quoteState, setQuoteState] = useState<{
    key: string;
    quote?: CartQuote;
    error?: string;
  } | null>(null);
  const currentQuoteState = quoteState?.key === itemsKey ? quoteState : null;
  const quote = currentQuoteState?.quote ?? null;
  const quoteError = currentQuoteState?.error ?? "";
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"manual" | "cod">("manual");
  const [values, setValues] = useState(EMPTY_VALUES);

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
        if (!response.ok) throw new Error("Cart prices could not be refreshed.");
        return (await response.json()) as CartQuote;
      })
      .then((nextQuote) => {
        setQuoteState({ key: itemsKey, quote: nextQuote });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setQuoteState({
            key: itemsKey,
            error: error instanceof Error ? error.message : "Cart prices could not be refreshed.",
          });
        }
      });
    return () => controller.abort();
  }, [hydrated, items, itemsKey]);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !quote ||
      !quote.all_available ||
      quote.delivery_fee_configured === false ||
      (paymentMethod === "cod" && !quote.cod_available) ||
      submitting
    )
      return;
    setSubmitting(true);
    setMessage("");

    try {
      const sessionResponse = await fetch("/api/checkout/session", { method: "POST" });
      if (!sessionResponse.ok)
        throw new Error("Checkout could not be started. Refresh and try again.");

      const keyName = "lakh-checkout-idempotency-v1";
      let idempotencyKey = sessionStorage.getItem(keyName);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem(keyName, idempotencyKey);
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          idempotencyKey,
          ...values,
          confirmedSubtotalMinor: quote.subtotal_minor,
          confirmedQuoteHash: quote.quote_hash,
          paymentMethod,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        quote?: CartQuote | null;
        reference?: string;
      };

      if (response.status === 409 && result.error === "price_changed") {
        if (result.quote) setQuoteState({ key: itemsKey, quote: result.quote });
        setMessage("Prices changed. Review the updated subtotal and submit again to confirm.");
        return;
      }
      if (!response.ok || !result.reference) {
        throw new Error(result.error ?? "The order could not be saved. Your cart is still here.");
      }

      clearCart();
      router.push(`/order/${encodeURIComponent(result.reference)}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The order could not be saved. Retry from this page.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) return <p role="status">Loading checkout…</p>;
  if (items.length === 0) {
    return (
      <section className="cart-empty">
        <h2>Your cart is empty</h2>
        <Link className="button button--primary" href="/shop">
          Browse bangles
        </Link>
      </section>
    );
  }

  return (
    <div className="checkout-layout">
      <form className="account-form checkout-form" onSubmit={submitOrder}>
        <h2>Contact and delivery</h2>
        {isSignedIn ? (
          <p className="field-hint">This order will be saved to your customer account.</p>
        ) : (
          <p className="field-hint">
            You can check out as a guest, or{" "}
            <Link href="/account/login?next=%2Fcheckout">sign in</Link> first.
          </p>
        )}
        <label>
          Name
          <input
            autoComplete="name"
            maxLength={120}
            onChange={(event) => setValues({ ...values, customerName: event.target.value })}
            required
            value={values.customerName}
          />
        </label>
        <label>
          Email (optional)
          <input
            autoComplete="email"
            maxLength={254}
            onChange={(event) => setValues({ ...values, customerEmail: event.target.value })}
            type="email"
            value={values.customerEmail}
          />
        </label>
        <label>
          Phone
          <input
            autoComplete="tel"
            maxLength={40}
            onChange={(event) => setValues({ ...values, customerPhone: event.target.value })}
            required
            type="tel"
            value={values.customerPhone}
          />
        </label>
        <label>
          Delivery address
          <textarea
            autoComplete="street-address"
            maxLength={300}
            onChange={(event) => setValues({ ...values, deliveryAddress: event.target.value })}
            required
            rows={3}
            value={values.deliveryAddress}
          />
        </label>
        <label>
          City or town
          <input
            autoComplete="address-level2"
            maxLength={100}
            onChange={(event) => setValues({ ...values, deliveryCity: event.target.value })}
            required
            value={values.deliveryCity}
          />
        </label>
        <label>
          Postal code (optional)
          <input
            autoComplete="postal-code"
            maxLength={24}
            onChange={(event) => setValues({ ...values, deliveryPostalCode: event.target.value })}
            value={values.deliveryPostalCode}
          />
        </label>
        <label>
          Delivery note (optional)
          <textarea
            maxLength={500}
            onChange={(event) => setValues({ ...values, deliveryNote: event.target.value })}
            rows={2}
            value={values.deliveryNote}
          />
        </label>
        <fieldset className="checkout-payment-options">
          <legend>Payment arrangement</legend>
          <label>
            <input
              checked={paymentMethod === "manual"}
              name="payment_method"
              onChange={() => setPaymentMethod("manual")}
              type="radio"
              value="manual"
            />
            <span>Arrange payment after order confirmation</span>
          </label>
          <label>
            <input
              checked={paymentMethod === "cod"}
              disabled={!quote?.cod_available}
              name="payment_method"
              onChange={() => setPaymentMethod("cod")}
              type="radio"
              value="cod"
            />
            <span>Cash on delivery{!quote?.cod_available ? " · unavailable" : ""}</span>
          </label>
          <p className="field-hint">
            Online payment is not available yet. No gateway is connected and this site will not
            collect card details.
          </p>
        </fieldset>
        {message && (
          <p className="form-message form-message--error" role="alert">
            {message}
          </p>
        )}
        <button
          className="button button--primary"
          disabled={
            submitting ||
            !quote ||
            !quote.all_available ||
            quote.delivery_fee_configured === false ||
            (paymentMethod === "cod" && !quote.cod_available) ||
            Boolean(quoteError)
          }
          type="submit"
        >
          {submitting ? "Saving order…" : "Save order and continue"}
        </button>
        <p className="field-hint">This saves the order and quote. It does not reserve stock.</p>
      </form>

      <aside aria-labelledby="checkout-summary-title" className="cart-summary">
        <h2 id="checkout-summary-title">Order summary</h2>
        {quoteError && (
          <p className="form-message form-message--error" role="alert">
            {quoteError}
          </p>
        )}
        {quote?.items.map((item) => (
          <div className="cart-summary__line" key={item.variant_id}>
            <span>
              {item.product_title} · size {item.variant_label} · {item.quantity} complete sets
            </span>
            <strong>{formatLkrPrice(item.line_total_minor)}</strong>
          </div>
        ))}
        <div className="cart-summary__line cart-summary__line--total">
          <span>Items subtotal</span>
          <strong>{quote ? formatLkrPrice(quote.subtotal_minor) : "Refreshing…"}</strong>
        </div>
        {quote?.discount_minor ? (
          <div className="cart-summary__line">
            <span>{quote.offer_name ? `${quote.offer_name} discount` : "Offer discount"}</span>
            <strong>−{formatLkrPrice(quote.discount_minor)}</strong>
          </div>
        ) : null}
        <div className="cart-summary__line">
          <span>Delivery</span>
          <strong>
            {quote?.delivery_fee_configured === false
              ? "Fee needs admin setup"
              : quote?.delivery_fee_minor !== undefined
                ? quote.delivery_fee_minor === 0
                  ? "Free"
                  : formatLkrPrice(quote.delivery_fee_minor)
                : "Refreshing…"}
          </strong>
        </div>
        <div className="cart-summary__line cart-summary__line--total">
          <span>Order total</span>
          <strong>
            {quote?.total_minor !== undefined ? formatLkrPrice(quote.total_minor) : "—"}
          </strong>
        </div>
        {quote?.delivery_fee_configured === false ? (
          <p className="form-message form-message--error" role="alert">
            Delivery fees have not been set for every product. The store team needs to complete that
            setup before checkout.
          </p>
        ) : null}
        {quote && !quote.all_available && (
          <p className="form-message form-message--error" role="alert">
            A quantity is no longer available. Return to your cart to change it.
          </p>
        )}
        <Link className="text-link" href="/cart">
          Edit cart
        </Link>
      </aside>
    </div>
  );
}
