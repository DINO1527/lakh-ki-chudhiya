"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { logAdminActionFailure } from "./action-logger";
import { formText, integer } from "./form-values";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function adjustInventory(formData: FormData): Promise<never> {
  const variantId = formData.get("variant_id");
  const rawReturnProductId = formData.get("return_product_id");
  const requestedProductId =
    typeof rawReturnProductId === "string" && UUID_PATTERN.test(rawReturnProductId)
      ? rawReturnProductId
      : null;
  const delta = integer(formText(formData, "quantity_delta", 12));
  const reason = formText(formData, "reason", 500);
  if (
    typeof variantId !== "string" ||
    !UUID_PATTERN.test(variantId) ||
    delta === null ||
    delta === 0 ||
    !reason
  ) {
    redirect(inventoryErrorLocation(formData, "invalid", requestedProductId));
  }

  const { supabase } = await requireStaff();
  let returnProductId: string | null = null;
  if (requestedProductId) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("product_id")
      .eq("id", variantId)
      .maybeSingle();
    if (variant?.product_id === requestedProductId) returnProductId = requestedProductId;
  }
  const { error } = await supabase.rpc("adjust_inventory", {
    p_variant_id: variantId,
    p_quantity_delta: delta,
    p_reason: reason,
  });
  if (error) {
    logAdminActionFailure("adjustInventory", "inventory_movements", error.code);
    const reason =
      error.code === "PGRST202" || error.code === "42883"
        ? "database_update"
        : error.code === "42501"
          ? "permission"
          : "adjust";
    redirect(inventoryErrorLocation(formData, reason, returnProductId));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  if (returnProductId) revalidatePath(`/admin/products/${returnProductId}`);
  revalidatePath("/shop");
  revalidatePath("/");
  redirect(
    returnProductId
      ? `/admin/products/${returnProductId}?section=product-variants&stock=saved`
      : "/admin/inventory?saved=1",
  );
}

function inventoryErrorLocation(
  formData: FormData,
  error: "invalid" | "adjust" | "database_update" | "permission",
  returnProductId: string | null,
): string {
  const query = new URLSearchParams({ error });
  const sku = (formText(formData, "return_sku", 64) ?? "").replace(/[^\p{L}\p{N}-]/gu, "");
  if (sku) query.set("q", sku);
  if (returnProductId) query.set("return_product_id", returnProductId);
  return `/admin/inventory?${query.toString()}`;
}
