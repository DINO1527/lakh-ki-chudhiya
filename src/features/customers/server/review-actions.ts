"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActionFailure } from "@/features/admin/server/action-logger";
import { parseProductReviewDraft } from "../domain/product-review";
import { requireCustomer } from "./access";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitProductReview(formData: FormData): Promise<never> {
  const orderItemId = formData.get("order_item_id");
  const draft = parseProductReviewDraft(formData.get("rating"), formData.get("comment"));

  if (typeof orderItemId !== "string" || !UUID_PATTERN.test(orderItemId) || !draft) {
    redirect("/account/orders?review=invalid");
  }

  const { supabase } = await requireCustomer("/account/orders");
  const { error } = await supabase.rpc("submit_product_review", {
    p_order_item_id: orderItemId,
    p_rating: draft.rating,
    p_comment: draft.comment,
  });

  if (error) {
    logAdminActionFailure("submitProductReview", "product_reviews", error.code);
    redirect("/account/orders?review=unavailable");
  }

  revalidatePath("/account/orders");
  revalidatePath("/shop");
  redirect("/account/orders?review=submitted");
}
