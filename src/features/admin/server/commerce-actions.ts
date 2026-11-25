"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { formText, positiveInteger, validUuid } from "./form-values";
import { colomboDateTimeLocalToUtc } from "@/features/promotions/domain/schedule";

export async function saveCommerceSettings(formData: FormData): Promise<never> {
  const phoneInput = formText(formData, "whatsapp_number", 32);
  const codEnabled = formData.get("cod_enabled") === "on";
  if (phoneInput === null) redirect("/admin/settings/commerce?error=invalid");
  const normalizedPhone = phoneInput.replace(/[^0-9]/g, "");
  if (normalizedPhone !== "" && !/^[1-9][0-9]{7,14}$/.test(normalizedPhone)) {
    redirect("/admin/settings/commerce?error=invalid");
  }
  if (codEnabled && !normalizedPhone) redirect("/admin/settings/commerce?error=phone_required");

  const { supabase } = await requireStaff(["owner"]);
  const { error } = await supabase.rpc("save_commerce_settings", {
    p_whatsapp_number: normalizedPhone || null,
    p_cod_enabled: codEnabled,
  });
  if (error) redirect("/admin/settings/commerce?error=save");
  revalidatePath("/admin/settings/commerce");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/admin/settings/commerce?saved=1");
}

export async function saveOffer(formData: FormData): Promise<never> {
  const offerIdInput = formText(formData, "offer_id", 36);
  const offerId = offerIdInput === "" ? null : offerIdInput;
  const name = formText(formData, "name", 120);
  const targetType = formText(formData, "target_type", 20);
  const targetId = formText(formData, "target_id", 36);
  const minimumSets = positiveInteger(formText(formData, "minimum_sets", 4), 1000);
  const percent = parsePercent(formText(formData, "discount_percent", 8));
  const startsAtInput = formText(formData, "starts_at", 16);
  const endsAtInput = formText(formData, "ends_at", 16);
  const startsAt = startsAtInput === "" ? null : colomboDateTimeLocalToUtc(startsAtInput ?? "");
  const endsAt = endsAtInput === "" ? null : colomboDateTimeLocalToUtc(endsAtInput ?? "");
  const isEnabled = formData.get("is_enabled") === "on";
  if (
    offerIdInput === null ||
    (offerId !== null && !validUuid(offerId)) ||
    !name ||
    (targetType !== "product" && targetType !== "collection") ||
    !validUuid(targetId) ||
    !minimumSets ||
    percent === null ||
    startsAtInput === null ||
    endsAtInput === null ||
    (startsAtInput !== "" && !startsAt) ||
    (endsAtInput !== "" && !endsAt) ||
    (startsAt !== null && endsAt !== null && new Date(endsAt) <= new Date(startsAt))
  ) {
    redirect("/admin/offers?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("save_offer", {
    p_offer_id: offerId,
    p_name: name,
    p_target_type: targetType,
    p_target_id: targetId,
    p_minimum_sets: minimumSets,
    p_discount_basis_points: percent,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_is_enabled: isEnabled,
  });
  if (error) redirect("/admin/offers?error=save");
  revalidatePath("/admin/offers");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/admin/offers?saved=1");
}

function parsePercent(value: string | null): number | null {
  if (!value || !/^(?:0|[1-9][0-9]?|100)(?:\.[0-9]{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(basisPoints) && basisPoints > 0 && basisPoints <= 10_000
    ? basisPoints
    : null;
}
