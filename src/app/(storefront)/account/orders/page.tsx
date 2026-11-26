import type { Metadata } from "next";
import Link from "next/link";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import { requireCustomer } from "@/features/customers/server/access";
import { ProductReviewForm } from "@/features/customers/components/product-review-form";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your orders | Lacora",
  robots: { index: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AccountOrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const [{ supabase, user }, params] = await Promise.all([
    requireCustomer("/account/orders"),
    searchParams,
  ]);
  const ordersResult = await supabase
    .from("orders")
    .select(
      "id, reference, subtotal_minor, delivery_fee_minor, total_minor, status, payment_status, created_at",
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (ordersResult.error)
    logAdminQueryFailure("loadCustomerOrders", "orders", ordersResult.error.code);

  const deliveredOrderIds = (ordersResult.data ?? [])
    .filter((order) => order.status === "delivered")
    .map((order) => order.id);
  const itemsResult = deliveredOrderIds.length
    ? await supabase
        .from("order_items")
        .select("id, order_id, variant_id, product_title, variant_label, quantity")
        .in("order_id", deliveredOrderIds)
        .limit(500)
    : { data: [], error: null };
  if (itemsResult.error)
    logAdminQueryFailure("loadDeliveredOrderItems", "order_items", itemsResult.error.code);

  const items = itemsResult.data ?? [];
  const variantIds = [...new Set(items.map((item) => item.variant_id))];
  const variantsResult = variantIds.length
    ? await supabase.from("product_variants").select("id, product_id").in("id", variantIds)
    : { data: [], error: null };
  if (variantsResult.error)
    logAdminQueryFailure("loadReviewVariants", "product_variants", variantsResult.error.code);

  const productIds = [...new Set((variantsResult.data ?? []).map((variant) => variant.product_id))];
  const productsResult = productIds.length
    ? await supabase.from("products").select("id, status, reviews_enabled").in("id", productIds)
    : { data: [], error: null };
  if (productsResult.error)
    logAdminQueryFailure("loadReviewProducts", "products", productsResult.error.code);

  const itemIds = items.map((item) => item.id);
  const reviewsResult = itemIds.length
    ? await supabase
        .from("product_reviews")
        .select("id, order_item_id, rating, comment, status")
        .eq("user_id", user.id)
        .in("order_item_id", itemIds)
    : { data: [], error: null };
  if (reviewsResult.error)
    logAdminQueryFailure("loadCustomerReviews", "product_reviews", reviewsResult.error.code);

  const reviewDataError = Boolean(
    itemsResult.error || variantsResult.error || productsResult.error || reviewsResult.error,
  );
  const orderItemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const current = orderItemsByOrder.get(item.order_id) ?? [];
    current.push(item);
    orderItemsByOrder.set(item.order_id, current);
  }
  const productIdByVariant = new Map(
    (variantsResult.data ?? []).map((variant) => [variant.id, variant.product_id]),
  );
  const products = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
  const reviewsByItem = new Map(
    (reviewsResult.data ?? []).map((review) => [review.order_item_id, review]),
  );
  const reviewMessage = first(params.review);

  return (
    <main className="page-shell orders-page" id="main-content">
      <div className="order-history-heading">
        <div>
          <p className="eyebrow">Your Lacora account</p>
          <h1 className="page-heading">Order history</h1>
          <p className="page-intro">
            Follow your orders and, after delivery, share a rating and comment on the pieces you
            bought.
          </p>
        </div>
        <Link className="button button--quiet" href="/shop">
          Continue shopping
        </Link>
      </div>
      {reviewMessage === "submitted" ? (
        <p className="form-message form-message--success" role="status">
          Thank you. Your review has been sent for approval.
        </p>
      ) : reviewMessage === "invalid" ? (
        <p className="form-message form-message--error" role="alert">
          Add a star rating and a comment between 10 and 2,000 characters.
        </p>
      ) : reviewMessage ? (
        <p className="form-message form-message--error" role="alert">
          The review could not be saved. Confirm the order was delivered and try again.
        </p>
      ) : null}
      {ordersResult.error ? (
        <p className="form-message form-message--error" role="alert">
          Order history could not be loaded.
        </p>
      ) : ordersResult.data && ordersResult.data.length > 0 ? (
        <div className="order-list">
          {ordersResult.data.map((order) => (
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
              {reviewDataError ? (
                <p className="form-message form-message--error" role="alert">
                  Review options could not be loaded right now.
                </p>
              ) : order.status === "delivered" && orderItemsByOrder.has(order.id) ? (
                <section
                  aria-label={`Review items in order ${order.reference}`}
                  className="order-review-items"
                >
                  <h3>Share your experience</h3>
                  {orderItemsByOrder.get(order.id)?.map((item) => {
                    const productId = productIdByVariant.get(item.variant_id);
                    const product = productId ? products.get(productId) : null;
                    const review = reviewsByItem.get(item.id);
                    return (
                      <article className="order-review-item" key={item.id}>
                        <div>
                          <h4>{item.product_title}</h4>
                          <p>
                            {item.variant_label} · Quantity {item.quantity}
                          </p>
                        </div>
                        {product?.status === "published" && product.reviews_enabled ? (
                          <ProductReviewForm
                            draft={
                              review
                                ? {
                                    rating: review.rating,
                                    comment: review.comment,
                                    status: review.status,
                                  }
                                : undefined
                            }
                            orderItemId={item.id}
                          />
                        ) : review ? (
                          <p className="product-review-form__status">
                            Your review is {review.status}. This product is no longer accepting
                            edits.
                          </p>
                        ) : (
                          <p className="product-review-form__status">
                            Reviews are not currently open for this product.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </section>
              ) : null}
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

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "Asia/Colombo" }).format(
    new Date(value),
  );
}
