import type { Metadata } from "next";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import {
  inspectReturn,
  markOrderDeliveryFailed,
  recordOrderPayment,
  recordOrderRefund,
  setOrderDeliveryFee,
  transitionOrderStatus,
} from "@/features/admin/server/order-actions";
import { getAdminOrders } from "@/features/admin/server/order-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
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
      {params.saved ? <p className="admin-notice admin-notice--success">Order updated.</p> : null}
      {params.error ? (
        <p className="admin-notice admin-notice--error" role="alert">
          The order action could not be saved. Check payment, status, fee or return quantities.
        </p>
      ) : null}
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
                        {` · ${item.set_count_snapshot} bangles per set`}
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

              <dl className="order-admin-summary">
                <div>
                  <span>Items</span>
                  <strong>{formatLkrPrice(order.subtotal_minor)}</strong>
                </div>
                {order.discount_minor > 0 ? (
                  <div>
                    <span>{order.offer_name_snapshot ?? "Offer"}</span>
                    <strong>−{formatLkrPrice(order.discount_minor)}</strong>
                  </div>
                ) : null}
                <div>
                  <span>Delivery</span>
                  <strong>
                    {order.delivery_fee_minor === null
                      ? "Not set"
                      : order.delivery_fee_minor === 0
                        ? "Free"
                        : formatLkrPrice(order.delivery_fee_minor)}
                  </strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>
                    {order.total_minor === null
                      ? "Needs delivery fee"
                      : formatLkrPrice(order.total_minor)}
                  </strong>
                </div>
                <div>
                  <span>Payment choice</span>
                  <strong>
                    {order.payment_method === "cod" ? "Cash on delivery" : "Arrange manually"} ·{" "}
                    {formatStatus(order.payment_status)}
                  </strong>
                </div>
              </dl>

              {order.status !== "cancelled" && order.status !== "delivered" && (
                <div className="admin-order-card__controls">
                  {nextStatuses(
                    order.status,
                    order.payment_status !== "paid" && order.payment_status !== "pending",
                  ).length > 0 && (
                    <form action={transitionOrderStatus} className="admin-order-action">
                      <input name="order_id" type="hidden" value={order.id} />
                      <label>
                        Next status
                        <select name="next_status" required>
                          {nextStatuses(
                            order.status,
                            order.payment_status !== "paid" && order.payment_status !== "pending",
                          ).map((status) => (
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
                  {order.status === "dispatched" ? (
                    <form action={markOrderDeliveryFailed} className="admin-order-action">
                      <input name="order_id" type="hidden" value={order.id} />
                      <label>
                        Delivery failure reason
                        <input maxLength={500} name="reason" required />
                      </label>
                      <button className="admin-button" type="submit">
                        Mark delivery failed
                      </button>
                    </form>
                  ) : null}
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
                  {order.payment_status !== "paid" &&
                  order.payment_status !== "refunded" &&
                  order.status !== "pending_confirmation" &&
                  order.total_minor !== null ? (
                    <form action={recordOrderPayment} className="admin-order-action">
                      <input name="order_id" type="hidden" value={order.id} />
                      <label>
                        Amount received (LKR)
                        <input
                          defaultValue={(order.total_minor / 100).toFixed(2)}
                          inputMode="decimal"
                          min="0.01"
                          name="amount_lkr"
                          required
                          step="0.01"
                          type="number"
                        />
                      </label>
                      <label>
                        Receipt or collection note
                        <input maxLength={200} name="reference" required />
                      </label>
                      <button className="admin-button" type="submit">
                        Record received payment
                      </button>
                    </form>
                  ) : null}
                  {order.payment_status === "paid" && order.total_minor !== null ? (
                    <form action={recordOrderRefund} className="admin-order-action">
                      <input name="order_id" type="hidden" value={order.id} />
                      <label>
                        Full refund (LKR)
                        <input
                          defaultValue={(order.total_minor / 100).toFixed(2)}
                          inputMode="decimal"
                          min="0.01"
                          name="amount_lkr"
                          required
                          step="0.01"
                          type="number"
                        />
                      </label>
                      <label>
                        Refund reference and reason
                        <input maxLength={500} name="note" required />
                      </label>
                      <button className="admin-button" type="submit">
                        Record full refund
                      </button>
                    </form>
                  ) : null}
                </div>
              )}
              {order.status === "delivery_failed" || order.status === "delivered" ? (
                <section aria-label="Inspect returned sets" className="return-inspection">
                  <h3>Inspect returned stock</h3>
                  <p>
                    Only sellable sets are added back to stock. Damaged or missing sets remain
                    unavailable.
                  </p>
                  {order.items.map((item) => (
                    <form action={inspectReturn} className="admin-order-action" key={item.id}>
                      <input name="order_id" type="hidden" value={order.id} />
                      <input name="order_item_id" type="hidden" value={item.id} />
                      <input name="idempotency_key" type="hidden" value={crypto.randomUUID()} />
                      <strong>
                        {item.product_title} · size {item.variant_label} · {item.quantity} sets
                        dispatched
                      </strong>
                      <label>
                        Sellable
                        <input
                          inputMode="numeric"
                          max={item.quantity}
                          min="0"
                          name="sellable_quantity"
                          required
                          type="number"
                          defaultValue="0"
                        />
                      </label>
                      <label>
                        Damaged
                        <input
                          inputMode="numeric"
                          max={item.quantity}
                          min="0"
                          name="damaged_quantity"
                          required
                          type="number"
                          defaultValue="0"
                        />
                      </label>
                      <label>
                        Missing
                        <input
                          inputMode="numeric"
                          max={item.quantity}
                          min="0"
                          name="missing_quantity"
                          required
                          type="number"
                          defaultValue="0"
                        />
                      </label>
                      <label>
                        Inspection note
                        <input maxLength={500} name="reason" required />
                      </label>
                      <button className="admin-button" type="submit">
                        Save inspection and restock sellable sets
                      </button>
                    </form>
                  ))}
                </section>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function nextStatuses(status: string, canCancel: boolean): string[] {
  const transitions: Record<string, string[]> = {
    pending_confirmation: canCancel ? ["confirmed", "cancelled"] : ["confirmed"],
    confirmed: canCancel ? ["processing", "cancelled"] : ["processing"],
    processing: canCancel ? ["packed", "cancelled"] : ["packed"],
    packed: canCancel ? ["dispatched", "cancelled"] : ["dispatched"],
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
