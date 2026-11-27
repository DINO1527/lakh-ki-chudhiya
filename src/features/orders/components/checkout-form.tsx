"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "@/features/cart/components/cart-provider";
import type { CartQuote } from "@/features/cart/domain/cart";
import {
  isCheckoutFieldErrors,
  validateCheckoutDetails,
  type CheckoutDetails,
  type CheckoutField,
  type CheckoutFieldErrors,
} from "@/features/orders/domain/checkout-validation";
import { formatLkrPrice } from "@/features/products/domain/product-variant";

type CheckoutValues = CheckoutDetails;

export type CheckoutPrefill = Partial<CheckoutValues>;

const EMPTY_VALUES: CheckoutValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  deliveryAddress: "",
  deliveryCity: "",
  deliveryPostalCode: "",
  deliveryNote: "",
};

export function CheckoutForm({
  isSignedIn,
  initialValues,
}: {
  isSignedIn: boolean;
  initialValues?: CheckoutPrefill;
}) {
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
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [values, setValues] = useState<CheckoutValues>(() => ({
    ...EMPTY_VALUES,
    ...initialValues,
  }));

  function updateField(field: CheckoutField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setMessage("");
  }

  function focusFirstFieldError(errors: CheckoutFieldErrors) {
    const firstField = Object.keys(errors)[0] as CheckoutField | undefined;
    if (firstField) document.getElementById(`checkout-${firstField}`)?.focus();
  }

  function renderFieldError(field: CheckoutField) {
    const error = fieldErrors[field];
    return error ? (
      <span className="field-error" id={`checkout-${field}-error`}>
        {error}
      </span>
    ) : null;
  }

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
    const nextFieldErrors = validateCheckoutDetails(values);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage("Please correct the highlighted contact and delivery details.");
      focusFirstFieldError(nextFieldErrors);
      return;
    }
    setFieldErrors({});
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
        fieldErrors?: unknown;
      };

      if (response.status === 409 && result.error === "price_changed") {
        if (result.quote) setQuoteState({ key: itemsKey, quote: result.quote });
        setMessage("Prices changed. Review the updated subtotal and submit again to confirm.");
        return;
      }
      if (!response.ok || !result.reference) {
        if (isCheckoutFieldErrors(result.fieldErrors) && Object.keys(result.fieldErrors).length) {
          setFieldErrors(result.fieldErrors);
          setMessage(
            result.error ?? "Please correct the highlighted contact and delivery details.",
          );
          focusFirstFieldError(result.fieldErrors);
          return;
        }
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
      <form className="account-form checkout-form" noValidate onSubmit={submitOrder}>
        <h2>Contact and delivery</h2>
        {isSignedIn ? (
          <p className="field-hint">
            This order will be saved to your customer account.{" "}
            <Link href="/account/profile">Manage saved details</Link>
          </p>
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
            aria-describedby={fieldErrors.customerName ? "checkout-customerName-error" : undefined}
            aria-invalid={Boolean(fieldErrors.customerName)}
            id="checkout-customerName"
            maxLength={120}
            onChange={(event) => updateField("customerName", event.target.value)}
            required
            value={values.customerName}
          />
          {renderFieldError("customerName")}
        </label>
        <label>
          Email (optional)
          <input
            autoComplete="email"
            aria-describedby={
              fieldErrors.customerEmail ? "checkout-customerEmail-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.customerEmail)}
            id="checkout-customerEmail"
            maxLength={254}
            onChange={(event) => updateField("customerEmail", event.target.value)}
            type="email"
            value={values.customerEmail}
          />
          {renderFieldError("customerEmail")}
        </label>
        <label>
          Phone
          <input
            autoComplete="tel"
            aria-describedby={
              fieldErrors.customerPhone ? "checkout-customerPhone-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.customerPhone)}
            maxLength={40}
            id="checkout-customerPhone"
            inputMode="tel"
            onChange={(event) => updateField("customerPhone", event.target.value)}
            required
            type="tel"
            value={values.customerPhone}
          />
          {renderFieldError("customerPhone")}
        </label>
        <label>
          Delivery address
          <textarea
            autoComplete="street-address"
            aria-describedby={
              fieldErrors.deliveryAddress ? "checkout-deliveryAddress-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.deliveryAddress)}
            maxLength={300}
            id="checkout-deliveryAddress"
            onChange={(event) => updateField("deliveryAddress", event.target.value)}
            required
            rows={3}
            value={values.deliveryAddress}
          />
          {renderFieldError("deliveryAddress")}
        </label>
        <label>
          City or town
          <input
            autoComplete="address-level2"
            aria-describedby={fieldErrors.deliveryCity ? "checkout-deliveryCity-error" : undefined}
            aria-invalid={Boolean(fieldErrors.deliveryCity)}
            id="checkout-deliveryCity"
            maxLength={100}
            onChange={(event) => updateField("deliveryCity", event.target.value)}
            required
            value={values.deliveryCity}
          />
          {renderFieldError("deliveryCity")}
        </label>
        <label>
          Postal code (optional)
          <input
            autoComplete="postal-code"
            aria-describedby={
              fieldErrors.deliveryPostalCode ? "checkout-deliveryPostalCode-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.deliveryPostalCode)}
            maxLength={24}
            id="checkout-deliveryPostalCode"
            onChange={(event) => updateField("deliveryPostalCode", event.target.value)}
            value={values.deliveryPostalCode}
          />
          {renderFieldError("deliveryPostalCode")}
        </label>
        <label>
          Delivery note (optional)
          <textarea
            aria-describedby={fieldErrors.deliveryNote ? "checkout-deliveryNote-error" : undefined}
            aria-invalid={Boolean(fieldErrors.deliveryNote)}
            id="checkout-deliveryNote"
            maxLength={500}
            onChange={(event) => updateField("deliveryNote", event.target.value)}
            rows={2}
            value={values.deliveryNote}
          />
          {renderFieldError("deliveryNote")}
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
          <div className="checkout-summary-item" key={item.variant_id}>
            {item.product_preview?.images[0] ? (
              <Image
                alt={item.product_preview.images[0].altText}
                className="checkout-summary-item__image"
                height={160}
                src={item.product_preview.images[0].url}
                unoptimized
                width={160}
              />
            ) : (
              <span aria-hidden="true" className="checkout-summary-item__placeholder">
                L
              </span>
            )}
            <span className="checkout-summary-item__description">
              <strong>{item.product_title}</strong>
              <small>
                Size {item.variant_label} · {item.quantity} complete{" "}
                {item.quantity === 1 ? "set" : "sets"}
                {item.set_count ? ` of ${item.set_count} bangles` : ""}
              </small>
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
