import type { PublicProductReviewData } from "../server/review-data";

export function ProductReviews({ data }: Readonly<{ data: PublicProductReviewData | null }>) {
  return (
    <section aria-labelledby="product-reviews-heading" className="product-reviews">
      <div className="product-reviews__heading">
        <div>
          <p className="eyebrow">Customer notes</p>
          <h2 id="product-reviews-heading">Reviews</h2>
        </div>
        {data ? (
          <div className="product-reviews__summary">
            <span aria-label={`${data.averageRating} out of 5 stars`} className="review-stars">
              {renderStars(data.averageRating)}
            </span>
            <strong>{data.averageRating.toFixed(1)}</strong>
            <span>
              {data.reviewCount} {data.reviewCount === 1 ? "review" : "reviews"}
            </span>
          </div>
        ) : null}
      </div>
      {!data ? (
        <p className="product-reviews__empty" role="status">
          Reviews could not be loaded right now. Please try again later.
        </p>
      ) : data.reviews.length ? (
        <div className="product-reviews__list">
          {data.reviews.map((review) => (
            <article className="product-review" key={review.id}>
              <div className="product-review__meta">
                <span aria-label={`${review.rating} out of 5 stars`} className="review-stars">
                  {renderStars(review.rating)}
                </span>
                <span className="product-review__verified">Verified purchase</span>
                <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
              </div>
              <p>{review.comment}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="product-reviews__empty">
          No approved reviews yet. Customers can share their experience after delivery.
        </p>
      )}
    </section>
  );
}

function renderStars(rating: number): string {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function formatReviewDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}
