"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActionFailure } from "./action-logger";
import { requireStaff } from "./access";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function moderateProductReview(formData: FormData): Promise<never> {
  const reviewId = formData.get("review_id");
  const productId = formData.get("product_id");
  const nextStatus = formData.get("status");
  if (
    typeof reviewId !== "string" ||
    !UUID_PATTERN.test(reviewId) ||
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    (nextStatus !== "approved" && nextStatus !== "rejected")
  ) {
    redirect("/admin/reviews?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("moderate_product_review", {
    p_review_id: reviewId,
    p_status: nextStatus,
  });
  if (error) {
    logAdminActionFailure("moderateProductReview", "product_reviews", error.code);
    redirect("/admin/reviews?error=save");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/");
  redirect(`/admin/reviews?saved=${nextStatus}`);
}
