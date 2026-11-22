import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import { CopyOrderReference } from "@/features/orders/components/copy-order-reference";
import { getOrderSummaryByReference } from "@/features/orders/server/order-summary";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Order details | Lakh Ki Chudhiya",
  robots: { index: false },
};

type PageProps = { params: Promise<{ reference: string }> };

export default async function OrderPage({ params }: PageProps) {
  const { reference } = await params;
  const result = await getOrderSummaryByReference(reference);
  if (result.status === "not_found") notFound();
  if (result.status === "error") {
    return (
      <main className="page-shell account-page" id="main-content">
        <p className="eyebrow">Order</p>
        <h1 className="page-heading">Order details unavailable</h1>
        <p role="alert">
          We could not load this order. Sign in or return from the device where you placed it.
        </p>
      </main>
    );
  }
  const order = result.order;

  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Order saved</p>
      <h1 className="page-heading">Thank you, {order.customer_name}</h1>
      <p className="page-intro">
        This is an unpaid order request. Staff must confirm availability and delivery before it is
        fulfilled.
      </p>
      <section aria-labelledby="order-status-heading" className="order-confirmation">
        <h2 id="order-status-heading">Order status</h2>
        <p className="order-status-badge">{formatStatus(order.status)}</p>
        <p>Payment: {formatStatus(order.payment_status)}</p>
        <CopyOrderReference reference={order.reference} />
      </section>

      <section aria-labelledby="order-items-heading" className="order-detail-section">
        <h2 id="order-items-heading">Items</h2>
        <ul className="order-line-list">
          {order.items.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.product_title}</strong>
                <small>
                  {item.variant_label} · {item.quantity} × {formatLkrPrice(item.unit_price_minor)}
                </small>
              </span>
              <strong>{formatLkrPrice(item.line_total_minor)}</strong>
            </li>
          ))}
        </ul>
        <div className="cart-summary__line">
          <span>Items subtotal</span>
          <strong>{formatLkrPrice(order.subtotal_minor)}</strong>
        </div>
        <div className="cart-summary__line">
          <span>Delivery</span>
          <strong>
            {order.delivery_fee_minor === null
              ? "To be confirmed"
              : formatLkrPrice(order.delivery_fee_minor)}
          </strong>
        </div>
        {order.total_minor !== null && (
          <div className="cart-summary__line cart-summary__line--total">
            <span>Total</span>
            <strong>{formatLkrPrice(order.total_minor)}</strong>
          </div>
        )}
      </section>

      <section aria-labelledby="delivery-heading" className="order-detail-section">
        <h2 id="delivery-heading">Delivery details</h2>
        <p>{order.customer_phone}</p>
        {order.customer_email && <p>{order.customer_email}</p>}
        <p>
          {order.delivery_address}, {order.delivery_city}
          {order.delivery_postal_code ? ` ${order.delivery_postal_code}` : ""}
        </p>
        {order.delivery_note && <p>Note: {order.delivery_note}</p>}
      </section>

      <p className="order-follow-up">
        No WhatsApp message was sent. Contact details have not yet been configured; keep this
        reference for follow-up.
      </p>
    </main>
  );
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
