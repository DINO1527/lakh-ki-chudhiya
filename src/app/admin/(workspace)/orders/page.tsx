import type { Metadata } from "next";
import { AdminDialog } from "@/features/admin/components/admin-dialog";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
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
const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const pageNumber = rawPage && /^[0-9]{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = (rawSearch ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32);
  const result = await getAdminOrders({ page: pageNumber, search });
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
      <section aria-label="Search orders" className="admin-panel">
        <AdminSearchForm
          action="/admin/orders"
          label="Search by order reference"
          placeholder="For example, LKC-000001"
          query={search}
        />
      </section>
      {result.status === "error" ? (
        <p className="admin-notice admin-notice--error" role="alert">
          Orders could not be loaded.
        </p>
      ) : result.orders.length === 0 ? (
        <section className="admin-empty-state">
          <h2>{search ? "No matching orders" : "No order requests yet"}</h2>
          <p>
            {search
              ? "Check the reference and try again."
              : "Saved UAT and customer orders will appear here. Cart additions do not create orders or reserve stock."}
          </p>
        </section>
      ) : (
        <>
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
                      <AdminDialog
                        description="Status changes can reserve, consume or release stock. Add a note for the order history."
                        eyebrow="Order action"
                        title={`Update ${order.reference}`}
                        triggerLabel="Change status"
                      >
                        <form action={transitionOrderStatus} className="admin-order-action">
                          <input name="order_id" type="hidden" value={order.id} />
                          <label>
                            Next status
                            <select name="next_status" required>
                              {nextStatuses(
                                order.status,
                                order.payment_status !== "paid" &&
                                  order.payment_status !== "pending",
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
                          <ConfirmButton
                            className="admin-button admin-button--primary"
                            formAction={transitionOrderStatus}
                            message="Apply the selected order status and its stock transition?"
                          >
                            Review status change
                          </ConfirmButton>
                        </form>
                      </AdminDialog>
                    )}
                    {order.status === "dispatched" ? (
                      <AdminDialog
                        description="Record a failed delivery attempt with the carrier or customer reason."
                        eyebrow="Order action"
                        title={`Delivery issue · ${order.reference}`}
                        triggerLabel="Record delivery issue"
                      >
                        <form action={markOrderDeliveryFailed} className="admin-order-action">
                          <input name="order_id" type="hidden" value={order.id} />
                          <label>
                            Delivery failure reason
                            <input maxLength={500} name="reason" required />
                          </label>
                          <AdminSubmitButton>Mark delivery failed</AdminSubmitButton>
                        </form>
                      </AdminDialog>
                    ) : null}
                    {order.status !== "dispatched" && (
                      <AdminDialog
                        description="Enter the confirmed delivery amount and note how it was agreed."
                        eyebrow="Order action"
                        title={`Set delivery · ${order.reference}`}
                        triggerLabel="Set delivery fee"
                      >
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
                          <AdminSubmitButton>Save delivery fee</AdminSubmitButton>
                        </form>
                      </AdminDialog>
                    )}
                    {order.payment_status !== "paid" &&
                    order.payment_status !== "refunded" &&
                    order.status !== "pending_confirmation" &&
                    order.total_minor !== null ? (
                      <AdminDialog
                        description="This records a payment already received outside this application."
                        eyebrow="Order action"
                        title={`Record payment · ${order.reference}`}
                        triggerLabel="Record payment"
                      >
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
                          <ConfirmButton
                            className="admin-button admin-button--primary"
                            formAction={recordOrderPayment}
                            message="Record this amount as received for the order?"
                          >
                            Review payment record
                          </ConfirmButton>
                        </form>
                      </AdminDialog>
                    ) : null}
                    {order.payment_status === "paid" && order.total_minor !== null ? (
                      <AdminDialog
                        description="This records a full refund already issued outside this application."
                        eyebrow="Order action"
                        title={`Record refund · ${order.reference}`}
                        triggerLabel="Record full refund"
                      >
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
                          <ConfirmButton
                            className="admin-button admin-button--danger"
                            formAction={recordOrderRefund}
                            message="Record a full refund for this order?"
                          >
                            Review refund record
                          </ConfirmButton>
                        </form>
                      </AdminDialog>
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
                      <AdminDialog
                        description="Only the quantity marked sellable will return to available stock. Damaged or missing sets stay unavailable."
                        eyebrow="Return inspection"
                        key={item.id}
                        title={`${item.product_title} · ${item.variant_label}`}
                        triggerLabel={`Inspect ${item.variant_label}`}
                      >
                        <form action={inspectReturn} className="admin-order-action">
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
                          <AdminSubmitButton>Save inspection</AdminSubmitButton>
                        </form>
                      </AdminDialog>
                    ))}
                  </section>
                ) : null}
              </article>
            ))}
          </div>
          <AdminPagination
            action="/admin/orders"
            itemLabel="orders"
            page={pageNumber}
            pageSize={PAGE_SIZE}
            query={params}
            total={result.total}
          />
        </>
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
