"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { logAdminActionFailure } from "./action-logger";
import { formText, integer, lkrToMinor, positiveInteger, productSlug } from "./form-values";
import { detectImageMime } from "./media-validation";
import {
  productMediaPublicationErrorType,
  productPublicationErrorType,
} from "../domain/product-action-errors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCT_IMAGES = 20;
export async function createProduct(formData: FormData): Promise<never> {
  const title = formText(formData, "title", 160);
  const slug = productSlug(formData);
  const description = formText(formData, "description", 8_000);
  const material = formText(formData, "material", 160);
  const careInstructions = formText(formData, "care_instructions", 2_000);
  const setCount = positiveInteger(formText(formData, "set_count", 8), 32);
  const deliveryFeeMinor = parseOptionalDeliveryFee(formData);
  const codEnabled = formData.get("cod_enabled") === "on";
  if (
    !title ||
    !slug ||
    description === null ||
    material === null ||
    careInstructions === null ||
    !setCount ||
    setCount < 2 ||
    deliveryFeeMinor === undefined
  ) {
    redirect("/admin/products/new?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { data: lastProduct, error: orderReadError } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderReadError) {
    logAdminActionFailure("createProductOrder", "products", orderReadError.code);
    redirect("/admin/products/new?error=save");
  }
  const sortOrder = (lastProduct?.sort_order ?? -1) + 1;
  if (!Number.isSafeInteger(sortOrder) || sortOrder > 2_147_483_647) {
    redirect("/admin/products/new?error=save");
  }
  const { data, error } = await supabase
    .from("products")
    .insert({
      title,
      slug,
      description,
      material,
      care_instructions: careInstructions,
      set_count: setCount,
      delivery_fee_minor: deliveryFeeMinor,
      cod_enabled: codEnabled,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    logAdminActionFailure("createProduct", "products", error?.code);
    const errorType =
      error?.code === "23505"
        ? "duplicate"
        : error?.code === "42P17" || error?.code === "42501"
          ? "access"
          : "save";
    redirect(`/admin/products/new?error=${errorType}`);
  }
  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}?created=1&section=product-details`);
}

export async function updateProduct(formData: FormData): Promise<never> {
  return saveProductDetails(formData, "product-details", "product-details");
}

export async function updateProductAndContinue(formData: FormData): Promise<never> {
  return saveProductDetails(formData, "product-details", "product-collections");
}

async function saveProductDetails(
  formData: FormData,
  currentSection: "product-details",
  nextSection: "product-details" | "product-collections",
): Promise<never> {
  const productId = formData.get("product_id");
  const title = formText(formData, "title", 160);
  const slug = productSlug(formData);
  const description = formText(formData, "description", 8_000);
  const material = formText(formData, "material", 160);
  const careInstructions = formText(formData, "care_instructions", 2_000);
  const setCount = positiveInteger(formText(formData, "set_count", 8), 32);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  const deliveryFeeMinor = parseOptionalDeliveryFee(formData);
  const codEnabled = formData.get("cod_enabled") === "on";
  const reviewsEnabled = formData.get("reviews_enabled") === "on";
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    !title ||
    !slug ||
    description === null ||
    material === null ||
    careInstructions === null ||
    !setCount ||
    setCount < 2 ||
    sortOrder === null ||
    sortOrder < 0 ||
    sortOrder > 100_000 ||
    deliveryFeeMinor === undefined
  ) {
    if (typeof productId === "string" && UUID_PATTERN.test(productId)) {
      redirectToProductEditor(productId, currentSection, "error=invalid");
    }
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error: reviewSettingsError } = await supabase
    .from("products")
    .select("reviews_enabled")
    .eq("id", productId)
    .maybeSingle();
  const reviewSettingMissing = ["PGRST204", "42703", "42501"].includes(
    reviewSettingsError?.code ?? "",
  );
  if (reviewSettingsError && !reviewSettingMissing) {
    logAdminActionFailure("updateProductReviewSetting", "products", reviewSettingsError.code);
    redirectToProductEditor(productId, currentSection, "error=save");
  }

  const productFields = {
    title,
    slug,
    description,
    material,
    care_instructions: careInstructions,
    set_count: setCount,
    delivery_fee_minor: deliveryFeeMinor,
    cod_enabled: codEnabled,
  };
  const { error } = reviewSettingsError
    ? await supabase.from("products").update(productFields).eq("id", productId)
    : await supabase
        .from("products")
        .update({ ...productFields, reviews_enabled: reviewsEnabled })
        .eq("id", productId);

  if (error) {
    logAdminActionFailure("updateProduct", "products", error.code);
    redirectToProductEditor(productId, currentSection, "error=save");
  }
  const { error: orderError } = await supabase.rpc("move_product_display_order", {
    p_product_id: productId,
    p_sort_order: sortOrder,
  });
  if (orderError) {
    logAdminActionFailure("moveProductDisplayOrder", "products", orderError.code);
    redirectToProductEditor(productId, currentSection, "error=order");
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, nextSection, "saved=1");
}

export async function saveProductVariant(formData: FormData): Promise<never> {
  return saveProductVariantForm(formData, "product-variants");
}

export async function saveProductVariantAndContinue(formData: FormData): Promise<never> {
  return saveProductVariantForm(formData, "product-images");
}

async function saveProductVariantForm(
  formData: FormData,
  nextSection: "product-variants" | "product-images",
): Promise<never> {
  const productId = formData.get("product_id");
  const variantId = formData.get("variant_id");
  const sku = formText(formData, "sku", 64)?.toUpperCase() ?? null;
  const sizeCode = formText(formData, "size_code", 16);
  const diameterText = formText(formData, "inner_diameter_mm", 16);
  const priceMinor = lkrToMinor(formText(formData, "price_lkr", 12));
  const compareAtInput = formText(formData, "compare_at_price_lkr", 12);
  const compareAtPriceMinor = compareAtInput === "" ? 0 : lkrToMinor(compareAtInput);
  const activeValue = formData.get("is_active");
  const isActive = activeValue === "active";
  const diameter = diameterText === "" ? null : Number(diameterText);

  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    !sku ||
    !/^[A-Z0-9][A-Z0-9-]{0,63}$/.test(sku) ||
    sizeCode === null ||
    (sizeCode !== "" && !/^[\p{L}\p{N}-]+$/u.test(sizeCode)) ||
    diameterText === null ||
    (diameter !== null &&
      (!/^[0-9]{1,3}(?:\.[0-9]{1,2})?$/.test(diameterText ?? "") ||
        !Number.isFinite(diameter) ||
        diameter <= 0 ||
        diameter > 999.99)) ||
    priceMinor === null ||
    priceMinor <= 0 ||
    compareAtPriceMinor === null ||
    (compareAtPriceMinor > 0 && compareAtPriceMinor <= priceMinor) ||
    (activeValue !== "active" && activeValue !== "inactive") ||
    (typeof variantId === "string" && variantId !== "" && !UUID_PATTERN.test(variantId))
  ) {
    if (typeof productId === "string" && UUID_PATTERN.test(productId)) {
      redirectToProductEditor(productId, "product-variants", "error=invalid");
    }
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const values = {
    sku,
    size_code: sizeCode || null,
    inner_diameter_mm: diameter,
    price_minor: priceMinor,
    compare_at_price_minor: compareAtPriceMinor || null,
    is_active: isActive,
  };

  const result =
    typeof variantId === "string" && variantId
      ? await supabase
          .from("product_variants")
          .update(values)
          .eq("id", variantId)
          .eq("product_id", productId)
      : await supabase.from("product_variants").insert({ product_id: productId, ...values });

  if (result.error) {
    logAdminActionFailure("saveProductVariant", "product_variants", result.error.code);
    redirectToProductEditor(productId, "product-variants", "error=variant");
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, nextSection, "saved=1");
}

export async function setProductCollections(formData: FormData): Promise<never> {
  return setProductCollectionsForm(formData, "product-collections");
}

export async function setProductCollectionsAndContinue(formData: FormData): Promise<never> {
  return setProductCollectionsForm(formData, "product-variants");
}

async function setProductCollectionsForm(
  formData: FormData,
  nextSection: "product-collections" | "product-variants",
): Promise<never> {
  const productId = formData.get("product_id");
  const rawIds = formData.getAll("collection_ids");
  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    redirect("/admin/products?error=invalid");
  }
  if (rawIds.some((value) => typeof value !== "string" || !UUID_PATTERN.test(value))) {
    redirectToProductEditor(productId, "product-collections", "error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("set_product_collections", {
    p_product_id: productId,
    p_collection_ids: [...new Set(rawIds as string[])],
  });
  if (error) {
    logAdminActionFailure("setProductCollections", "product_collections", error.code);
    redirectToProductEditor(productId, "product-collections", "error=collections");
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, nextSection, "saved=1");
}

export async function publishProduct(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    redirect("/admin/products?error=invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("publish_product", { p_product_id: productId });
  if (error) {
    logAdminActionFailure("publishProduct", "products", error.code);
    const errorType = productPublicationErrorType(error.code);
    redirectToProductEditor(productId, "product-details", `error=${errorType}`);
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, "product-details", "published=1");
}

export async function toggleProductPublication(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const nextStatus = formData.get("next_status");
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    (nextStatus !== "draft" && nextStatus !== "published")
  ) {
    redirect(buildProductListLocation(formData, "error", "invalid"));
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc(
    nextStatus === "published" ? "publish_product" : "unpublish_product",
    { p_product_id: productId },
  );
  if (error) {
    logAdminActionFailure("toggleProductPublication", "products", error.code);
    redirect(buildProductListLocation(formData, "error", productPublicationErrorType(error.code)));
  }

  revalidateCatalogue(productId);
  redirect(buildProductListLocation(formData, "changed", nextStatus));
}

export async function archiveProduct(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    redirect("/admin/products?error=invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("archive_product", { p_product_id: productId });
  if (error) {
    logAdminActionFailure("archiveProduct", "products", error.code);
    redirectToProductEditor(productId, "product-details", "error=archive");
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, "product-details", "archived=1");
}

export async function uploadProductImage(formData: FormData): Promise<never> {
  return uploadProductImageForm(formData, false);
}

export async function uploadProductImageAndFinish(formData: FormData): Promise<never> {
  return uploadProductImageForm(formData, true);
}

async function uploadProductImageForm(
  formData: FormData,
  finishAfterSave: boolean,
): Promise<never> {
  const productId = formData.get("product_id");
  const altText = formText(formData, "alt_text", 250);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  const file = formData.get("file");
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    !altText ||
    sortOrder === null ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_MEDIA_BYTES
  ) {
    if (typeof productId === "string" && UUID_PATTERN.test(productId)) {
      redirectToProductEditor(productId, "product-images", "error=invalid");
    }
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { count, error: countError } = await supabase
    .from("product_media")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("media_type", "image")
    .neq("status", "archived");
  if (countError || (count ?? 0) >= MAX_PRODUCT_IMAGES) {
    if (countError)
      logAdminActionFailure("uploadProductImage.count", "product_media", countError.code);
    redirectToProductEditor(productId, "product-images", "error=media_limit");
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMime(signature);
  if (!detected || detected !== file.type) {
    redirectToProductEditor(productId, "product-images", "error=media");
  }

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });

  if (uploadError) {
    logAdminActionFailure("uploadProductImage.storage", "product-media", uploadError.name);
    redirectToProductEditor(productId, "product-images", "error=media");
  }
  const { error: metadataError } = await supabase.from("product_media").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: altText,
    media_type: "image",
    sort_order: sortOrder,
  });

  if (metadataError) {
    logAdminActionFailure("uploadProductImage.metadata", "product_media", metadataError.code);
    const { error: cleanupError } = await supabase.storage
      .from("product-media")
      .remove([storagePath]);
    if (cleanupError) {
      logAdminActionFailure("uploadProductImage.cleanup", "product-media", cleanupError.name);
    }
    redirectToProductEditor(productId, "product-images", "error=media");
  }

  revalidateCatalogue(productId);
  if (finishAfterSave) {
    redirect(buildProductListLocation(formData, "changed", "photos"));
  }
  redirectToProductEditor(productId, "product-images", "media=uploaded");
}

export async function archiveProductImage(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const mediaId = formData.get("media_id");
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    typeof mediaId !== "string" ||
    !UUID_PATTERN.test(mediaId)
  ) {
    if (typeof productId === "string" && UUID_PATTERN.test(productId)) {
      redirectToProductEditor(productId, "product-images", "error=invalid");
    }
    redirect("/admin/products?error=invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("archive_product_media", {
    p_media_id: mediaId,
    p_product_id: productId,
  });
  if (error) {
    logAdminActionFailure("archiveProductImage", "product_media", error.code);
    const reason = error.code === "23514" ? "last_image" : "media";
    redirectToProductEditor(productId, "product-images", `error=${reason}`);
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, "product-images", "media=archived");
}

export async function updateProductImage(formData: FormData): Promise<never> {
  return updateProductImageForm(formData, false);
}

export async function updateProductImageAndFinish(formData: FormData): Promise<never> {
  return updateProductImageForm(formData, true);
}

async function updateProductImageForm(
  formData: FormData,
  finishAfterSave: boolean,
): Promise<never> {
  const productId = formData.get("product_id");
  const mediaId = formData.get("media_id");
  const altText = formText(formData, "alt_text", 250);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    typeof mediaId !== "string" ||
    !UUID_PATTERN.test(mediaId) ||
    !altText ||
    sortOrder === null
  ) {
    if (typeof productId === "string" && UUID_PATTERN.test(productId)) {
      redirectToProductEditor(productId, "product-images", "error=invalid");
    }
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("product_media")
    .update({ alt_text: altText, sort_order: sortOrder })
    .eq("id", mediaId)
    .eq("product_id", productId);
  if (error) {
    logAdminActionFailure("updateProductImage", "product_media", error.code);
    redirectToProductEditor(productId, "product-images", "error=media");
  }
  revalidateCatalogue(productId);
  if (finishAfterSave) {
    redirect(buildProductListLocation(formData, "changed", "photos"));
  }
  redirectToProductEditor(productId, "product-images", "media=updated");
}

export async function publishProductImage(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const mediaId = formData.get("media_id");
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    typeof mediaId !== "string" ||
    !UUID_PATTERN.test(mediaId)
  ) {
    if (typeof productId === "string" && UUID_PATTERN.test(productId)) {
      redirectToProductEditor(productId, "product-images", "error=invalid");
    }
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("publish_product_media", {
    p_media_id: mediaId,
    p_product_id: productId,
  });
  if (error) {
    logAdminActionFailure("publishProductImage", "product_media", error.code);
    redirectToProductEditor(
      productId,
      "product-images",
      `error=${productMediaPublicationErrorType(error.code, "publish")}`,
    );
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, "product-images", "media=published");
}

export async function unpublishProductImage(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const mediaId = formData.get("media_id");
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    typeof mediaId !== "string" ||
    !UUID_PATTERN.test(mediaId)
  ) {
    if (typeof productId === "string" && UUID_PATTERN.test(productId)) {
      redirectToProductEditor(productId, "product-images", "error=invalid");
    }
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("unpublish_product_media", {
    p_media_id: mediaId,
    p_product_id: productId,
  });
  if (error) {
    logAdminActionFailure("unpublishProductImage", "product_media", error.code);
    const reason = productMediaPublicationErrorType(error.code, "unpublish");
    redirectToProductEditor(productId, "product-images", `error=${reason}`);
  }
  revalidateCatalogue(productId);
  redirectToProductEditor(productId, "product-images", "media=drafted");
}

function revalidateCatalogue(productId: string): void {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}

function redirectToProductEditor(
  productId: string,
  section: "product-details" | "product-collections" | "product-variants" | "product-images",
  result: string,
): never {
  redirect(`/admin/products/${productId}?${result}&section=${section}`);
}

function buildProductListLocation(
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
  const rawStatus = formData.get("return_status");
  if (search) query.set("q", search);
  if (rawStatus === "draft" || rawStatus === "published" || rawStatus === "archived") {
    query.set("status", rawStatus);
  }
  query.set(resultKey, result);
  return `/admin/products?${query.toString()}`;
}

function parseOptionalDeliveryFee(formData: FormData): number | null | undefined {
  const value = formText(formData, "delivery_fee_lkr", 12);
  if (value === null) return undefined;
  if (value === "") return null;
  const minor = lkrToMinor(value);
  return minor === null ? undefined : minor;
}
