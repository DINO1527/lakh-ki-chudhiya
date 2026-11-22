import type { Metadata } from "next";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import { setOrderDeliveryFee, transitionOrderStatus } from "@/features/admin/server/order-actions";
import { getAdminOrders } from "@/features/admin/server/order-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const result = await getAdminOrders();
  return (
    <div className="admin-page-stack">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Commerce</p>
          <h1 className="admin-page-title">Orders</h1>
          <p className="admin-page-description">
            Confirm stock, set delivery, and record fulfilment transitions.
          </p>
        </div>
      </header>
      {result.status === "error" ? (
        <p className="admin-notice admin-notice--error" role="alert">
          Orders could not be loaded.
        </p>
      ) : result.orders.length === 0 ? (
        <section className="admin-empty-state">
          <h2>No order requests yet</h2>
          <p>
            Saved UAT and customer orders will appear here. Cart additions do not create orders or
            reserve stock.
          </p>
        </section>
      ) : (
        <div className="admin-order-list">
          {result.orders.map((order) => (
            <article className="admin-order-card" key={order.id}>
              <header className="admin-order-card__header">
                <div>
                  <p className="admin-eyebrow">{order.reference}</p>
                  <h2>{order.customer_name}</h2>
                  <p>
                    {formatDate(order.created_at)} · {formatStatus(order.status)} ·{" "}
                    {formatStatus(order.payment_status)}
                  </p>
                </div>
                <div className="admin-order-card__amount">
                  <strong>
                    {order.total_minor === null
                      ? `${formatLkrPrice(order.subtotal_minor)} + delivery`
                      : formatLkrPrice(order.total_minor)}
                  </strong>
                  <span>{order.customer_id ? "Account order" : "Guest order"}</span>
                </div>
              </header>

              <div className="admin-order-card__details">
                <section>
                  <h3>Items</h3>
                  <ul>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.product_title} · {item.variant_label} · {item.quantity} ×{" "}
                        {formatLkrPrice(item.unit_price_minor)}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3>Delivery contact</h3>
                  <p>
                    {order.customer_phone}
                    {order.customer_email ? ` · ${order.customer_email}` : ""}
                  </p>
                  <p>
                    {order.delivery_address}, {order.delivery_city}
                    {order.delivery_postal_code ? ` ${order.delivery_postal_code}` : ""}
                  </p>
                  {order.delivery_note && <p>Note: {order.delivery_note}</p>}
                </section>
              </div>

              {order.status !== "cancelled" && order.status !== "delivered" && (
                <div className="admin-order-card__controls">
                  {nextStatuses(order.status).length > 0 && (
                    <form action={transitionOrderStatus} className="admin-order-action">
                      <input name="order_id" type="hidden" value={order.id} />
                      <label>
                        Next status
                        <select name="next_status" required>
                          {nextStatuses(order.status).map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Reason
                        <input
                          maxLength={500}
                          name="reason"
                          placeholder="Customer contacted; stock checked"
                          required
                        />
                      </label>
                      <button className="admin-button admin-button--primary" type="submit">
                        Save status
                      </button>
                    </form>
                  )}
                  {order.status !== "dispatched" && (
                    <form
                      action={setOrderDeliveryFee}
                      className="admin-order-action admin-order-action--fee"
                    >
                      <input name="order_id" type="hidden" value={order.id} />
                      <label>
                        Delivery fee (LKR)
                        <input
                          defaultValue={
                            order.delivery_fee_minor === null
                              ? ""
                              : (order.delivery_fee_minor / 100).toFixed(2)
                          }
                          inputMode="decimal"
                          maxLength={14}
                          min="0"
                          name="delivery_fee"
                          placeholder="0.00"
                          required
                          step="0.01"
                          type="number"
                        />
                      </label>
                      <label>
                        Reason
                        <input
                          maxLength={500}
                          name="reason"
                          placeholder="Delivery quote confirmed"
                          required
                        />
                      </label>
                      <button className="admin-button" type="submit">
                        Set delivery fee
                      </button>
                    </form>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function nextStatuses(status: string): string[] {
  const transitions: Record<string, string[]> = {
    pending_confirmation: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["packed", "cancelled"],
    packed: ["dispatched", "cancelled"],
    dispatched: ["delivered"],
  };
  return transitions[status] ?? [];
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "Asia/Colombo" }).format(
    new Date(value),
  );
}
