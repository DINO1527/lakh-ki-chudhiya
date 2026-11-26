import Link from "next/link";
import {
  AdminPageHeader,
  AdminNotice,
  StatusBadge,
  formatAdminDate,
} from "@/features/admin/components/admin-ui";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { moderateProductReview } from "@/features/admin/server/review-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

const PAGE_SIZE = 20;
const STATUSES = ["pending", "approved", "rejected"] as const;

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const search = first(params.q).normalize("NFKC").replace(/[%_,]/g, " ").trim().slice(0, 80);
  const rawStatus = first(params.status);
  const status: "" | (typeof STATUSES)[number] = STATUSES.includes(
    rawStatus as (typeof STATUSES)[number],
  )
    ? (rawStatus as (typeof STATUSES)[number])
    : "";
  const pageNumber = Number(first(params.page));
  const page =
    Number.isSafeInteger(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 10_000) : 1;

  let query = supabase
    .from("product_reviews")
    .select("id, product_id, rating, comment, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("comment", `%${search}%`);
  const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) logAdminQueryFailure("loadProductReviews", "product_reviews", error.code);
  const reviews = data ?? [];
  const productIds = [...new Set(reviews.map((review) => review.product_id))];
  const productsResult = productIds.length
    ? await supabase.from("products").select("id, title, slug").in("id", productIds)
    : { data: [], error: null };
  if (productsResult.error)
    logAdminQueryFailure("loadReviewProducts", "products", productsResult.error.code);
  const products = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
  const total = count ?? 0;
  const saved = first(params.saved);
  const errorValue = first(params.error);

  return (
    <>
      <AdminPageHeader
        eyebrow="Customer feedback"
        title="Reviews"
        description="Check verified customer comments before they appear on product pages."
      />
      {saved === "approved" ? (
        <AdminNotice tone="success">Review approved and published.</AdminNotice>
      ) : null}
      {saved === "rejected" ? (
        <AdminNotice tone="success">Review declined and hidden from shoppers.</AdminNotice>
      ) : null}
      {errorValue ? (
        <AdminNotice tone="error">
          The review could not be updated. Refresh and try again.
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice tone="error">
          {error.code === "PGRST205"
            ? "The review database update is missing. Apply the current UAT migrations, then refresh this page."
            : "Reviews could not be loaded. Refresh the page or try again."}
        </AdminNotice>
      ) : (
        <section aria-label="Product reviews" className="admin-panel">
          <AdminSearchForm
            action="/admin/reviews"
            hasFilters={Boolean(status)}
            label="Search review comments"
            placeholder="Search comments"
            query={search}
          >
            <label className="admin-field admin-field--compact">
              <span>Review status</span>
              <select defaultValue={status} name="status">
                <option value="">All reviews</option>
                <option value="pending">Awaiting review</option>
                <option value="approved">Published</option>
                <option value="rejected">Declined</option>
              </select>
            </label>
          </AdminSearchForm>
          {reviews.length ? (
            <div className="admin-review-list">
              {reviews.map((review) => {
                const product = products.get(review.product_id);
                return (
                  <article className="admin-review-card" key={review.id}>
                    <div className="admin-review-card__heading">
                      <div>
                        <span
                          aria-label={`${review.rating} out of 5 stars`}
                          className="review-stars"
                        >
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>
                        <p className="admin-review-card__product">
                          {product ? (
                            <Link href={`/admin/products/${product.id}`}>{product.title}</Link>
                          ) : (
                            "Product no longer available"
                          )}
                        </p>
                      </div>
                      <StatusBadge>{review.status}</StatusBadge>
                    </div>
                    <p className="admin-review-card__comment">{review.comment}</p>
                    <div className="admin-review-card__footer">
                      <p>Submitted {formatAdminDate(review.created_at)} · Verified purchase</p>
                      {review.status !== "approved" ? (
                        <form action={moderateProductReview}>
                          <input name="review_id" type="hidden" value={review.id} />
                          <input name="product_id" type="hidden" value={review.product_id} />
                          <input name="status" type="hidden" value="approved" />
                          <ConfirmButton
                            className="admin-button admin-button--primary admin-button--compact"
                            formAction={moderateProductReview}
                            message="Approve this verified review? It will be visible on the product page."
                          >
                            Approve
                          </ConfirmButton>
                        </form>
                      ) : null}
                      {review.status !== "rejected" ? (
                        <form action={moderateProductReview}>
                          <input name="review_id" type="hidden" value={review.id} />
                          <input name="product_id" type="hidden" value={review.product_id} />
                          <input name="status" type="hidden" value="rejected" />
                          <ConfirmButton
                            className="admin-button admin-button--danger admin-button--compact"
                            formAction={moderateProductReview}
                            message="Decline this review? It will stay hidden from shoppers."
                          >
                            Decline
                          </ConfirmButton>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty-state">
              <h2>No reviews found</h2>
              <p>Verified customer reviews will appear here after delivery.</p>
            </div>
          )}
          <AdminPagination
            action="/admin/reviews"
            itemLabel="reviews"
            page={page}
            pageSize={PAGE_SIZE}
            query={{ q: search || undefined, status: status || undefined }}
            total={total}
          />
        </section>
      )}
    </>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
