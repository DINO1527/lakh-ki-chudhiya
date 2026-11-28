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
  const returnOfferId = offerId !== null && validUuid(offerId) ? offerId : null;
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
    redirect(offerActionUrl(returnOfferId, "error", "invalid"));
  }

  const { supabase } = await requireStaff();
  if (isEnabled) {
    const targetResult =
      targetType === "product"
        ? await supabase.from("products").select("status").eq("id", targetId).maybeSingle()
        : await supabase.from("collections").select("status").eq("id", targetId).maybeSingle();
    if (targetResult.error) {
      logAdminActionFailure(
        "saveOffer.target",
        targetType === "product" ? "products" : "collections",
        targetResult.error.code,
      );
      redirect(offerActionUrl(returnOfferId, "error", "target_check"));
    }
    if (targetResult.data?.status !== "published")
      redirect(offerActionUrl(returnOfferId, "error", "target_required"));
  }
  const { data: savedOfferId, error } = await supabase.rpc("save_offer", {
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
  if (error || !savedOfferId) {
    logAdminActionFailure("saveOffer", "offers", error?.code);
    const errorCode =
      error?.code === "23514"
        ? "banner_required"
        : error?.code === "P0002"
          ? "target_missing"
          : error?.code === "22023"
            ? "invalid"
            : "save";
    redirect(offerActionUrl(returnOfferId, "error", errorCode));
  }
  revalidatePath("/admin/offers");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect(offerResultUrl(savedOfferId, offerId === null ? "created" : "saved", "1", formData));
}

export async function toggleOfferPublication(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const nextEnabled = formData.get("next_enabled");
  if (!validUuid(offerId) || (nextEnabled !== "true" && nextEnabled !== "false")) {
    redirect(offerListLocation(formData, "error", "invalid"));
  }

  const { supabase } = await requireStaff();
  const { data: offer, error: readError } = await supabase
    .from("offers")
    .select(
      "id, name, target_type, target_product_id, target_collection_id, minimum_sets, discount_basis_points, starts_at, ends_at",
    )
    .eq("id", offerId)
    .maybeSingle();
  if (readError || !offer) {
    if (readError) logAdminActionFailure("toggleOfferPublication.read", "offers", readError.code);
    redirect(offerListLocation(formData, "error", "missing_record"));
  }

  const targetId =
    offer.target_type === "product" ? offer.target_product_id : offer.target_collection_id;
  if (!targetId) redirect(offerListLocation(formData, "error", "invalid"));
  if (nextEnabled === "true") {
    const targetResult =
      offer.target_type === "product"
        ? await supabase.from("products").select("status").eq("id", targetId).maybeSingle()
        : await supabase.from("collections").select("status").eq("id", targetId).maybeSingle();
    if (targetResult.error) {
      logAdminActionFailure(
        "toggleOfferPublication.target",
        offer.target_type === "product" ? "products" : "collections",
        targetResult.error.code,
      );
      redirect(offerListLocation(formData, "error", "target_check"));
    }
    if (targetResult.data?.status !== "published") {
      redirect(offerListLocation(formData, "error", "target_required"));
    }
  }

  const { error } = await supabase.rpc("save_offer", {
    p_offer_id: offer.id,
    p_name: offer.name,
    p_target_type: offer.target_type,
    p_target_id: targetId,
    p_minimum_sets: offer.minimum_sets,
    p_discount_basis_points: offer.discount_basis_points,
    p_starts_at: offer.starts_at,
    p_ends_at: offer.ends_at,
    p_is_enabled: nextEnabled === "true",
  });
  if (error) {
    logAdminActionFailure("toggleOfferPublication", "offers", error.code);
    const errorType = error.code === "23514" ? "banner_required" : "toggle";
    redirect(offerListLocation(formData, "error", errorType));
  }

  revalidateOfferPages();
  redirect(offerListLocation(formData, "changed", nextEnabled === "true" ? "enabled" : "disabled"));
}

function offerListLocation(
  formData: FormData,
  resultKey: "changed" | "error",
  result: string,
): string {
  const query = new URLSearchParams();
  const rawSearch = formData.get("return_q");
  const search =
    typeof rawSearch === "string"
      ? rawSearch
          .normalize("NFKC")
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .slice(0, 64)
          .trim()
      : "";
  const rawPage = formData.get("return_page");
  if (search) query.set("q", search);
  if (typeof rawPage === "string" && /^[0-9]{1,5}$/.test(rawPage) && Number(rawPage) > 1) {
    query.set("page", rawPage);
  }
  const rawOfferId = formData.get("offer_id");
  if (typeof rawOfferId === "string" && validUuid(rawOfferId)) query.set("offer", rawOfferId);
  query.set(resultKey, result);
  return `/admin/offers?${query.toString()}`;
}

export async function uploadOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const altText = formText(formData, "alt_text", 250);
  const file = formData.get("file");
  const publishAfterUpload = formData.get("publish_after_upload") === "on";
  const returnOfferId = validUuid(offerId) ? offerId : null;
  if (
    !validUuid(offerId) ||
    !altText ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_OFFER_BANNER_BYTES
  ) {
    redirect(offerActionUrl(returnOfferId, "error", "banner_invalid"));
  }

  const { supabase } = await requireStaff();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, is_enabled")
    .eq("id", offerId)
    .maybeSingle();
  if (offerError || !offer) {
    if (offerError) logAdminActionFailure("uploadOfferBanner.offer", "offers", offerError.code);
    redirect(offerResultUrl(offerId, "error", "banner_invalid"));
  }
  if (offer.is_enabled) redirect(offerResultUrl(offerId, "error", "banner_active"));

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMime(signature);
  if (!detected || detected !== file.type) {
    redirect(offerResultUrl(offerId, "error", "banner_invalid"));
  }

  const { count, error: countError } = await supabase
    .from("offer_media")
    .select("id", { count: "exact", head: true })
    .eq("offer_id", offerId)
    .neq("status", "archived");
  if (countError || (count ?? 0) > 0) {
    if (countError)
      logAdminActionFailure("uploadOfferBanner.count", "offer_media", countError.code);
    redirect(offerResultUrl(offerId, "error", "banner_exists"));
  }

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `offers/${offerId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });
  if (uploadError) {
    logAdminActionFailure("uploadOfferBanner.storage", "product-media", uploadError.name);
    redirect(offerResultUrl(offerId, "error", "banner_upload"));
  }

  const { error: metadataError } = await supabase.from("offer_media").insert({
    offer_id: offerId,
    storage_path: storagePath,
    alt_text: altText,
    status: publishAfterUpload ? "published" : "draft",
  });
  if (metadataError) {
    logAdminActionFailure("uploadOfferBanner.metadata", "offer_media", metadataError.code);
    const { error: cleanupError } = await supabase.storage
      .from("product-media")
      .remove([storagePath]);
    if (cleanupError)
      logAdminActionFailure("uploadOfferBanner.cleanup", "product-media", cleanupError.name);
    redirect(offerResultUrl(offerId, "error", "banner_upload"));
  }

  revalidateOfferPages();
  redirect(offerResultUrl(offerId, "banner", "uploaded", formData));
}

export async function updateOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const mediaId = formText(formData, "media_id", 36);
  const altText = formText(formData, "alt_text", 250);
  if (!validUuid(offerId) || !validUuid(mediaId) || !altText) {
    redirect(offerActionUrl(offerId, "error", "banner_invalid", formData));
  }
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("offer_media")
    .update({ alt_text: altText })
    .eq("id", mediaId)
    .eq("offer_id", offerId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    logAdminActionFailure("updateOfferBanner", "offer_media", error?.code);
    redirect(offerResultUrl(offerId, "error", "banner_save"));
  }
  revalidateOfferPages();
  redirect(offerResultUrl(offerId, "banner", "updated"));
}

export async function publishOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const mediaId = formText(formData, "media_id", 36);
  if (!validUuid(offerId) || !validUuid(mediaId)) {
    redirect(offerActionUrl(offerId, "error", "banner_invalid"));
  }
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
    redirect(offerResultUrl(offerId, "error", "banner_publish"));
  }
  revalidateOfferPages();
  redirect(offerResultUrl(offerId, "banner", "published"));
}

export async function replaceOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const altText = formText(formData, "alt_text", 250);
  const file = formData.get("file");
  const publishAfterUpload = formData.get("publish_after_upload") === "on";
  if (
    !validUuid(offerId) ||
    !altText ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_OFFER_BANNER_BYTES
  ) {
    redirect(offerActionUrl(offerId, "error", "banner_invalid", formData));
  }

  const { supabase } = await requireStaff();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, is_enabled")
    .eq("id", offerId)
    .maybeSingle();
  if (offerError || !offer) {
    if (offerError) logAdminActionFailure("replaceOfferBanner.offer", "offers", offerError.code);
    redirect(offerResultUrl(offerId, "error", "missing_record", formData));
  }
  if (offer.is_enabled) redirect(offerResultUrl(offerId, "error", "banner_active", formData));

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMime(signature);
  if (!detected || detected !== file.type) {
    redirect(offerResultUrl(offerId, "error", "banner_invalid", formData));
  }

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `offers/${offerId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });
  if (uploadError) {
    logAdminActionFailure("replaceOfferBanner.storage", "product-media", uploadError.name);
    redirect(offerResultUrl(offerId, "error", "banner_upload", formData));
  }

  const { data: oldPaths, error } = await supabase.rpc("replace_offer_banner", {
    p_offer_id: offerId,
    p_storage_path: storagePath,
    p_alt_text: altText,
  });
  if (error) {
    logAdminActionFailure("replaceOfferBanner", "offer_media", error.code);
    const { error: cleanupError } = await supabase.storage
      .from("product-media")
      .remove([storagePath]);
    if (cleanupError)
      logAdminActionFailure("replaceOfferBanner.cleanup", "product-media", cleanupError.name);
    redirect(
      offerResultUrl(
        offerId,
        "error",
        error.code === "23514"
          ? "banner_active"
          : error.code === "42883" || error.code === "PGRST202"
            ? "database_update"
            : "banner_replace",
        formData,
      ),
    );
  }

  if (publishAfterUpload) {
    const { error: publishError } = await supabase
      .from("offer_media")
      .update({ status: "published" })
      .eq("offer_id", offerId)
      .eq("storage_path", storagePath);
    if (publishError) {
      logAdminActionFailure("replaceOfferBanner.publish", "offer_media", publishError.code);
      redirect(offerResultUrl(offerId, "error", "banner_publish", formData));
    }
  }

  revalidateOfferPages();
  if (oldPaths?.length) {
    const { error: cleanupError } = await supabase.storage.from("product-media").remove(oldPaths);
    if (cleanupError) {
      logAdminActionFailure("replaceOfferBanner.old_storage", "product-media", cleanupError.name);
      redirect(offerResultUrl(offerId, "banner", "cleanup_pending", formData));
    }
  }
  redirect(offerResultUrl(offerId, "banner", "replaced", formData));
}

export async function deleteOfferBanner(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  const mediaId = formText(formData, "media_id", 36);
  if (!validUuid(offerId) || !validUuid(mediaId)) {
    redirect(offerActionUrl(offerId, "error", "banner_invalid", formData));
  }
  const { supabase } = await requireStaff();
  const { data: storagePath, error } = await supabase.rpc("delete_offer_media", {
    p_offer_id: offerId,
    p_media_id: mediaId,
  });
  if (error || !storagePath) {
    logAdminActionFailure(
      "deleteOfferBanner",
      "offer_media",
      error?.code ?? "missing_storage_path",
    );
    redirect(
      offerResultUrl(
        offerId,
        "error",
        error?.code === "23514"
          ? "banner_active"
          : error?.code === "P0002"
            ? "missing_record"
            : error?.code === "42883" || error?.code === "PGRST202"
              ? "database_update"
              : "banner_delete",
        formData,
      ),
    );
  }
  revalidateOfferPages();
  const { error: cleanupError } = await supabase.storage
    .from("product-media")
    .remove([storagePath]);
  if (cleanupError) {
    logAdminActionFailure("deleteOfferBanner.storage", "product-media", cleanupError.name);
    redirect(offerResultUrl(offerId, "error", "storage_cleanup", formData));
  }
  redirect(offerResultUrl(offerId, "banner", "deleted", formData));
}

export async function deleteOffer(formData: FormData): Promise<never> {
  const offerId = formText(formData, "offer_id", 36);
  if (!validUuid(offerId)) redirect("/admin/offers?error=invalid");

  const { supabase } = await requireStaff();
  const { data: storagePaths, error } = await supabase.rpc("delete_offer", {
    p_offer_id: offerId,
  });
  if (error) {
    logAdminActionFailure("deleteOffer", "offers", error.code);
    redirect(
      offerListResultUrl(
        formData,
        "error",
        error.code === "42883" || error.code === "PGRST202" ? "database_update" : "offer_delete",
      ),
    );
  }

  revalidateOfferPages();
  if (storagePaths?.length) {
    const { error: cleanupError } = await supabase.storage
      .from("product-media")
      .remove(storagePaths);
    if (cleanupError) {
      logAdminActionFailure("deleteOffer.storage", "product-media", cleanupError.name);
      redirect(offerListResultUrl(formData, "error", "storage_cleanup"));
    }
  }

  redirect(offerListResultUrl(formData, "deleted", "1"));
}

function offerActionUrl(
  offerId: string | null,
  parameter: "error" | "banner",
  value: string,
  formData?: FormData,
): string {
  return validUuid(offerId)
    ? offerResultUrl(offerId, parameter, value, formData)
    : "/admin/offers?" + parameter + "=" + encodeURIComponent(value);
}

function offerResultUrl(
  offerId: string,
  parameter: "banner" | "created" | "error" | "saved",
  value: string,
  formData?: FormData,
): string {
  const query = new URLSearchParams({ offer: offerId, [parameter]: value });
  if (formData) {
    const search = formText(formData, "return_q", 64);
    const page = formText(formData, "return_page", 5);
    if (search) query.set("q", search);
    if (page && /^[0-9]{1,5}$/.test(page) && Number(page) > 1) query.set("page", page);
    if (formData.get("publish_after_upload") === "on") query.set("publish", "1");
  }
  const anchor =
    formData?.get("save_intent") === "banner" ? `offer-banner-${offerId}` : `offer-${offerId}`;
  return "/admin/offers?" + query.toString() + "#" + anchor;
}

function offerListResultUrl(formData: FormData, key: string, value: string): string {
  const query = new URLSearchParams();
  const search = formText(formData, "return_q", 64);
  const page = formText(formData, "return_page", 5);
  if (search) query.set("q", search);
  if (page && /^[0-9]{1,5}$/.test(page) && Number(page) > 1) query.set("page", page);
  query.set(key, value);
  return "/admin/offers?" + query.toString();
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
