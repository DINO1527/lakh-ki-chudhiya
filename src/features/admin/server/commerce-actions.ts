"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { logAdminActionFailure } from "./action-logger";
import { formText, positiveInteger, validUuid } from "./form-values";
import { detectImageMime } from "./media-validation";
import { colomboDateTimeLocalToUtc } from "@/features/promotions/domain/schedule";

const MAX_OFFER_BANNER_BYTES = 5 * 1024 * 1024;

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
  if (error) {
    logAdminActionFailure("saveCommerceSettings", "store_settings", error.code);
    redirect("/admin/settings/commerce?error=save");
  }
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
  if (error) {
    logAdminActionFailure("saveOffer", "offers", error.code);
    redirect(`/admin/offers?error=${error.code === "23514" ? "banner_required" : "save"}`);
  }
  revalidatePath("/admin/offers");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/admin/offers?saved=1");
}

export async function uploadOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const altText = formText(formData, "alt_text", 250);
  const file = formData.get("file");
  if (
    !validUuid(offerId) ||
    !altText ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_OFFER_BANNER_BYTES
  ) {
    redirect("/admin/offers?error=banner_invalid");
  }

  const { supabase } = await requireStaff();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id")
    .eq("id", offerId)
    .maybeSingle();
  if (offerError || !offer) {
    if (offerError) logAdminActionFailure("uploadOfferBanner.offer", "offers", offerError.code);
    redirect("/admin/offers?error=banner_invalid");
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMime(signature);
  if (!detected || detected !== file.type) redirect("/admin/offers?error=banner_invalid");

  const { count, error: countError } = await supabase
    .from("offer_media")
    .select("id", { count: "exact", head: true })
    .eq("offer_id", offerId)
    .neq("status", "archived");
  if (countError || (count ?? 0) > 0) {
    if (countError)
      logAdminActionFailure("uploadOfferBanner.count", "offer_media", countError.code);
    redirect("/admin/offers?error=banner_exists");
  }

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `offers/${offerId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });
  if (uploadError) {
    logAdminActionFailure("uploadOfferBanner.storage", "product-media", uploadError.name);
    redirect("/admin/offers?error=banner_upload");
  }

  const { error: metadataError } = await supabase.from("offer_media").insert({
    offer_id: offerId,
    storage_path: storagePath,
    alt_text: altText,
  });
  if (metadataError) {
    logAdminActionFailure("uploadOfferBanner.metadata", "offer_media", metadataError.code);
    const { error: cleanupError } = await supabase.storage
      .from("product-media")
      .remove([storagePath]);
    if (cleanupError)
      logAdminActionFailure("uploadOfferBanner.cleanup", "product-media", cleanupError.name);
    redirect("/admin/offers?error=banner_upload");
  }

  revalidateOfferPages();
  redirect("/admin/offers?banner=uploaded");
}

export async function updateOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const mediaId = formText(formData, "media_id", 36);
  const altText = formText(formData, "alt_text", 250);
  if (!validUuid(offerId) || !validUuid(mediaId) || !altText) {
    redirect("/admin/offers?error=banner_invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("offer_media")
    .update({ alt_text: altText })
    .eq("id", mediaId)
    .eq("offer_id", offerId);
  if (error) {
    logAdminActionFailure("updateOfferBanner", "offer_media", error.code);
    redirect("/admin/offers?error=banner_save");
  }
  revalidateOfferPages();
  redirect("/admin/offers?banner=updated");
}

export async function publishOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const mediaId = formText(formData, "media_id", 36);
  if (!validUuid(offerId) || !validUuid(mediaId)) redirect("/admin/offers?error=banner_invalid");
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("offer_media")
    .update({ status: "published" })
    .eq("id", mediaId)
    .eq("offer_id", offerId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) logAdminActionFailure("publishOfferBanner", "offer_media", error.code);
    redirect("/admin/offers?error=banner_publish");
  }
  revalidateOfferPages();
  redirect("/admin/offers?banner=published");
}

export async function archiveOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const mediaId = formText(formData, "media_id", 36);
  if (!validUuid(offerId) || !validUuid(mediaId)) redirect("/admin/offers?error=banner_invalid");
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("offer_media")
    .update({ status: "archived" })
    .eq("id", mediaId)
    .eq("offer_id", offerId);
  if (error) {
    logAdminActionFailure("archiveOfferBanner", "offer_media", error.code);
    redirect(`/admin/offers?error=${error.code === "23514" ? "banner_active" : "banner_archive"}`);
  }
  revalidateOfferPages();
  redirect("/admin/offers?banner=archived");
}

function revalidateOfferPages(): void {
  revalidatePath("/admin/offers");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

function parsePercent(value: string | null): number | null {
  if (!value || !/^(?:0|[1-9][0-9]?|100)(?:\.[0-9]{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(basisPoints) && basisPoints > 0 && basisPoints <= 10_000
    ? basisPoints
    : null;
}
