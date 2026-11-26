"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { logAdminActionFailure } from "./action-logger";
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
  if (error) {
    logAdminActionFailure("transitionOrderStatus", "orders", error.code);
    redirect("/admin/orders?error=transition");
  }
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
  if (error) {
    logAdminActionFailure("setOrderDeliveryFee", "orders", error.code);
    redirect("/admin/orders?error=delivery");
  }
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  redirect("/admin/orders?saved=1");
}

export async function markOrderDeliveryFailed(formData: FormData): Promise<never> {
  const orderId = formText(formData, "order_id", 36);
  const reason = formText(formData, "reason", 500);
  if (!validUuid(orderId) || !reason) redirect("/admin/orders?error=invalid");
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("mark_order_delivery_failed", {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) {
    logAdminActionFailure("markOrderDeliveryFailed", "orders", error.code);
    redirect("/admin/orders?error=delivery_failed");
  }
  revalidateOrderViews();
  redirect("/admin/orders?saved=delivery_failed");
}

export async function recordOrderPayment(formData: FormData): Promise<never> {
  const orderId = formText(formData, "order_id", 36);
  const amountMinor = lkrToMinor(formText(formData, "amount_lkr", 14));
  const reference = formText(formData, "reference", 200);
  if (!validUuid(orderId) || amountMinor === null || !reference) {
    redirect("/admin/orders?error=invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("record_order_payment", {
    p_order_id: orderId,
    p_amount_minor: amountMinor,
    p_reference: reference,
  });
  if (error) {
    logAdminActionFailure("recordOrderPayment", "orders", error.code);
    redirect("/admin/orders?error=payment");
  }
  revalidateOrderViews();
  redirect("/admin/orders?saved=payment");
}

export async function recordOrderRefund(formData: FormData): Promise<never> {
  const orderId = formText(formData, "order_id", 36);
  const amountMinor = lkrToMinor(formText(formData, "amount_lkr", 14));
  const note = formText(formData, "note", 500);
  if (!validUuid(orderId) || amountMinor === null || !note) {
    redirect("/admin/orders?error=invalid");
  }
  const { supabase } = await requireStaff(["owner"]);
  const { error } = await supabase.rpc("record_order_refund", {
    p_order_id: orderId,
    p_amount_minor: amountMinor,
    p_note: note,
  });
  if (error) {
    logAdminActionFailure("recordOrderRefund", "orders", error.code);
    redirect("/admin/orders?error=refund");
  }
  revalidateOrderViews();
  redirect("/admin/orders?saved=refund");
}

export async function inspectReturn(formData: FormData): Promise<never> {
  const orderId = formText(formData, "order_id", 36);
  const orderItemId = formText(formData, "order_item_id", 36);
  const key = formText(formData, "idempotency_key", 36);
  const sellable = Number(formText(formData, "sellable_quantity", 8));
  const damaged = Number(formText(formData, "damaged_quantity", 8));
  const missing = Number(formText(formData, "missing_quantity", 8));
  const reason = formText(formData, "reason", 500);
  if (
    !validUuid(orderId) ||
    !validUuid(orderItemId) ||
    !validUuid(key) ||
    !Number.isSafeInteger(sellable) ||
    sellable < 0 ||
    !Number.isSafeInteger(damaged) ||
    damaged < 0 ||
    !Number.isSafeInteger(missing) ||
    missing < 0 ||
    !reason ||
    sellable + damaged + missing < 1
  )
    redirect("/admin/orders?error=inspection");

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("record_return_inspection", {
    p_order_item_id: orderItemId,
    p_idempotency_key: key,
    p_sellable_quantity: sellable,
    p_damaged_quantity: damaged,
    p_missing_quantity: missing,
    p_reason: reason,
  });
  if (error) {
    logAdminActionFailure("inspectReturn", "return_inspections", error.code);
    redirect("/admin/orders?error=inspection");
  }
  revalidateOrderViews();
  redirect("/admin/orders?saved=inspection");
}

function revalidateOrderViews(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/account/orders");
}
