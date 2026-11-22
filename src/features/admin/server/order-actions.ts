"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { formText, lkrToMinor, validUuid } from "./form-values";

const ORDER_STATUSES = [
  "confirmed",
  "processing",
  "packed",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export async function transitionOrderStatus(formData: FormData): Promise<never> {
  const orderId = formText(formData, "order_id", 36);
  const submittedStatus = formText(formData, "next_status", 32);
  const nextStatus = ORDER_STATUSES.find((status) => status === submittedStatus);
  const reason = formText(formData, "reason", 500);
  if (!validUuid(orderId) || !nextStatus || !reason) {
    redirect("/admin/orders?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("transition_order", {
    p_order_id: orderId,
    p_next_status: nextStatus,
    p_reason: reason,
  });
  if (error) redirect("/admin/orders?error=transition");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  redirect("/admin/orders?saved=1");
}

export async function setOrderDeliveryFee(formData: FormData): Promise<never> {
  const orderId = formText(formData, "order_id", 36);
  const feeMinor = lkrToMinor(formText(formData, "delivery_fee", 14));
  const reason = formText(formData, "reason", 500);
  if (!validUuid(orderId) || feeMinor === null || !reason) redirect("/admin/orders?error=invalid");

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("set_order_delivery_fee", {
    p_order_id: orderId,
    p_delivery_fee_minor: feeMinor,
    p_reason: reason,
  });
  if (error) redirect("/admin/orders?error=delivery");
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  redirect("/admin/orders?saved=1");
}
