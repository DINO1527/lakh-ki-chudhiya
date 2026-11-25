import type { Metadata } from "next";
import Link from "next/link";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import { requireCustomer } from "@/features/customers/server/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your orders | Lacora",
  robots: { index: false },
};

export default async function AccountOrdersPage() {
  const { supabase, user } = await requireCustomer("/account/orders");
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, reference, subtotal_minor, delivery_fee_minor, total_minor, status, payment_status, created_at",
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="page-shell orders-page" id="main-content">
      <div className="order-history-heading">
        <div>
          <p className="eyebrow">Your Lacora account</p>
          <h1 className="page-heading">Order history</h1>
          <p className="page-intro">
            Follow each order and review its saved payment and delivery details.
          </p>
        </div>
        <Link className="button button--quiet" href="/shop">
          Continue shopping
        </Link>
      </div>
      {error ? (
        <p className="form-message form-message--error" role="alert">
          Order history could not be loaded.
        </p>
      ) : orders && orders.length > 0 ? (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-history-card" key={order.id}>
              <div className="order-history-card__heading">
                <div>
                  <p className="eyebrow">Order reference</p>
                  <h2>
                    <Link href={`/order/${order.reference}`}>{order.reference}</Link>
                  </h2>
                  <p>Placed {formatDate(order.created_at)}</p>
                </div>
                <span className="order-status-badge" data-status={order.status}>
                  {formatStatus(order.status)}
                </span>
              </div>
              <div className="order-history-card__footer">
                <p>
                  <span>Order total</span>
                  <strong>
                    {order.total_minor === null
                      ? `${formatLkrPrice(order.subtotal_minor)} · delivery to be confirmed`
                      : formatLkrPrice(order.total_minor)}
                  </strong>
                </p>
                <p>
                  <span>Payment</span>
                  <strong>{formatStatus(order.payment_status)}</strong>
                </p>
                <Link className="button button--primary" href={`/order/${order.reference}`}>
                  View order <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="cart-empty">
          <span aria-hidden="true" className="cart-empty__mark">
            L
          </span>
          <h2>No orders yet</h2>
          <p>Your order history will appear here after you save an order.</p>
          <Link className="button button--primary" href="/shop">
            Explore the shop
          </Link>
        </section>
      )}
    </main>
  );
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "Asia/Colombo" }).format(
    new Date(value),
  );
}
