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
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Customer account</p>
      <h1 className="page-heading">Your orders</h1>
      {error ? (
        <p className="form-message form-message--error" role="alert">
          Order history could not be loaded.
        </p>
      ) : orders && orders.length > 0 ? (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-list__item" key={order.id}>
              <div>
                <h2>
                  <Link href={`/order/${order.reference}`}>{order.reference}</Link>
                </h2>
                <p>
                  {formatStatus(order.status)} · {formatDate(order.created_at)}
                </p>
              </div>
              <div className="order-list__amount">
                {order.total_minor === null
                  ? `${formatLkrPrice(order.subtotal_minor)} + delivery to be confirmed`
                  : formatLkrPrice(order.total_minor)}
                <span>{order.payment_status === "unpaid" ? "Unpaid" : order.payment_status}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="form-message">
          No orders yet. Your order history will appear here after checkout.
        </p>
      )}
      <Link className="text-link" href="/shop">
        Continue shopping
      </Link>
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
