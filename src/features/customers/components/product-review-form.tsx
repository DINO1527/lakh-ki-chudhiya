import { submitProductReview } from "../server/review-actions";

type ReviewDraft = Readonly<{
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
}>;

export function ProductReviewForm({
  orderItemId,
  draft,
}: Readonly<{ orderItemId: string; draft?: ReviewDraft }>) {
  return (
    <form action={submitProductReview} className="product-review-form">
      <input name="order_item_id" type="hidden" value={orderItemId} />
      {draft ? (
        <p className="product-review-form__status" role="status">
          {draft.status === "pending"
            ? "Your review is awaiting approval. Saving an edit sends it back for review."
            : draft.status === "approved"
              ? "Your review is published. Saving an edit will send it back for review."
              : "This review was declined. You can edit it and send it for another review."}
        </p>
      ) : (
        <p className="product-review-form__status">
          Your review will be checked before it appears on the product page.
        </p>
      )}
      <fieldset className="product-review-form__rating">
        <legend>Your rating</legend>
        <div>
          {[1, 2, 3, 4, 5].map((rating) => (
            <label key={rating} title={`${rating} ${rating === 1 ? "star" : "stars"}`}>
              <input
                defaultChecked={draft?.rating === rating}
                name="rating"
                required
                type="radio"
                value={rating}
              />
              <span aria-hidden="true">★</span>
              <span className="visually-hidden">
                {rating} {rating === 1 ? "star" : "stars"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Your comment</span>
        <textarea
          defaultValue={draft?.comment ?? ""}
          maxLength={2_000}
          minLength={10}
          name="comment"
          required
          rows={4}
        />
        <small>
          Share a helpful, honest note in 10 to 2,000 characters. Avoid phone numbers, addresses or
          other personal details.
        </small>
      </label>
      <button className="button button--primary" type="submit">
        {draft ? "Save review for approval" : "Send review for approval"}
      </button>
    </form>
  );
}
