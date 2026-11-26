import { describe, expect, it } from "vitest";
import { parseProductReviewDraft } from "./product-review";

describe("parseProductReviewDraft", () => {
  it("accepts and trims a comment at the minimum length", () => {
    expect(parseProductReviewDraft("5", "  A lovely set  ")).toEqual({
      rating: 5,
      comment: "A lovely set",
    });
  });

  it("accepts the maximum comment length", () => {
    const comment = "a".repeat(2_000);
    expect(parseProductReviewDraft("1", comment)).toEqual({ rating: 1, comment });
  });

  it.each(["0", "6", "1.5", "", null, "five"])("rejects an invalid rating value %s", (rating) => {
    expect(parseProductReviewDraft(rating, "A lovely set")).toBeNull();
  });

  it.each(["", "         ", "short", "a".repeat(2_001), null])(
    "rejects a comment outside the allowed range",
    (comment) => {
      expect(parseProductReviewDraft("4", comment)).toBeNull();
    },
  );
});
