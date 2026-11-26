export type ProductReviewDraft = Readonly<{
  rating: number;
  comment: string;
}>;

export function parseProductReviewDraft(
  ratingValue: FormDataEntryValue | null,
  commentValue: FormDataEntryValue | null,
): ProductReviewDraft | null {
  const rating =
    typeof ratingValue === "string" && /^[1-5]$/.test(ratingValue) ? Number(ratingValue) : null;
  const comment = typeof commentValue === "string" ? commentValue.trim() : "";
  if (rating === null || comment.length < 10 || comment.length > 2_000) return null;
  return { rating, comment };
}
