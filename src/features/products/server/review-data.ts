import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PublicProductReview = Readonly<{
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}>;

export type PublicProductReviewData = Readonly<{
  averageRating: number;
  reviewCount: number;
  reviews: readonly PublicProductReview[];
}>;

export async function getPublicProductReviews(
  productId: string,
): Promise<PublicProductReviewData | null> {
  const supabase = await createSupabaseServerClient();
  const [summaryResult, reviewsResult] = await Promise.all([
    supabase.rpc("get_product_review_summary", { p_product_id: productId }),
    supabase
      .from("product_reviews")
      .select("id, rating, comment, created_at")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(20),
  ]);

  if (summaryResult.error || reviewsResult.error) return null;
  const summary = summaryResult.data?.[0];

  return {
    averageRating: Number(summary?.average_rating ?? 0),
    reviewCount: Number(summary?.review_count ?? 0),
    reviews: (reviewsResult.data ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    })),
  };
}
