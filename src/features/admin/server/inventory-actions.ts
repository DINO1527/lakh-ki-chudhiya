"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { formText, integer } from "./form-values";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function adjustInventory(formData: FormData): Promise<never> {
  const variantId = formData.get("variant_id");
  const delta = integer(formText(formData, "quantity_delta", 12));
  const reason = formText(formData, "reason", 500);
  if (
    typeof variantId !== "string" ||
    !UUID_PATTERN.test(variantId) ||
    delta === null ||
    delta === 0 ||
    !reason
  ) {
    redirect("/admin/inventory?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("adjust_inventory", {
    p_variant_id: variantId,
    p_quantity_delta: delta,
    p_reason: reason,
  });
  if (error) redirect("/admin/inventory?error=adjust");

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/inventory?saved=1");
}
