"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { formText, integer, lkrToMinor, positiveInteger, productSlug } from "./form-values";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

export async function createProduct(formData: FormData): Promise<never> {
  const title = formText(formData, "title", 160);
  const slug = productSlug(formData);
  const description = formText(formData, "description", 8_000);
  const material = formText(formData, "material", 160);
  const careInstructions = formText(formData, "care_instructions", 2_000);
  const setCount = positiveInteger(formText(formData, "set_count", 8), 32);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  if (
    !title ||
    !slug ||
    description === null ||
    material === null ||
    careInstructions === null ||
    !setCount ||
    sortOrder === null
  ) {
    redirect("/admin/products/new?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("products")
    .insert({
      title,
      slug,
      description,
      material,
      care_instructions: careInstructions,
      set_count: setCount,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) redirect("/admin/products/new?error=save");
  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}?created=1`);
}

export async function updateProduct(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const title = formText(formData, "title", 160);
  const slug = productSlug(formData);
  const description = formText(formData, "description", 8_000);
  const material = formText(formData, "material", 160);
  const careInstructions = formText(formData, "care_instructions", 2_000);
  const setCount = positiveInteger(formText(formData, "set_count", 8), 32);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    !title ||
    !slug ||
    description === null ||
    material === null ||
    careInstructions === null ||
    !setCount ||
    sortOrder === null
  ) {
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("products")
    .update({
      title,
      slug,
      description,
      material,
      care_instructions: careInstructions,
      set_count: setCount,
      sort_order: sortOrder,
    })
    .eq("id", productId);

  if (error) redirect(`/admin/products/${productId}?error=save`);
  revalidateCatalogue(productId);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function saveProductVariant(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const variantId = formData.get("variant_id");
  const sku = formText(formData, "sku", 64)?.toUpperCase() ?? null;
  const sizeCode = formText(formData, "size_code", 16);
  const diameterText = formText(formData, "inner_diameter_mm", 16);
  const colourName = formText(formData, "colour_name", 80);
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
    !colourName ||
    priceMinor === null ||
    priceMinor <= 0 ||
    compareAtPriceMinor === null ||
    (compareAtPriceMinor > 0 && compareAtPriceMinor <= priceMinor) ||
    (activeValue !== "active" && activeValue !== "inactive") ||
    (typeof variantId === "string" && variantId !== "" && !UUID_PATTERN.test(variantId))
  ) {
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const values = {
    sku,
    size_code: sizeCode || null,
    inner_diameter_mm: diameter,
    colour_name: colourName,
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

  if (result.error) redirect(`/admin/products/${productId}?error=variant`);
  revalidateCatalogue(productId);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function setProductCollections(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const rawIds = formData.getAll("collection_ids");
  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    redirect("/admin/products?error=invalid");
  }
  if (rawIds.some((value) => typeof value !== "string" || !UUID_PATTERN.test(value))) {
    redirect(`/admin/products/${productId}?error=invalid`);
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("set_product_collections", {
    p_product_id: productId,
    p_collection_ids: [...new Set(rawIds as string[])],
  });
  if (error) redirect(`/admin/products/${productId}?error=collections`);
  revalidateCatalogue(productId);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function publishProduct(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    redirect("/admin/products?error=invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("publish_product", { p_product_id: productId });
  if (error) redirect(`/admin/products/${productId}?error=publish`);
  revalidateCatalogue(productId);
  redirect(`/admin/products/${productId}?published=1`);
}

export async function archiveProduct(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
    redirect("/admin/products?error=invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("archive_product", { p_product_id: productId });
  if (error) redirect(`/admin/products/${productId}?error=archive`);
  revalidateCatalogue(productId);
  redirect(`/admin/products/${productId}?archived=1`);
}

export async function uploadProductImage(formData: FormData): Promise<never> {
  const productId = formData.get("product_id");
  const altText = formText(formData, "alt_text", 250);
  const file = formData.get("file");
  if (
    typeof productId !== "string" ||
    !UUID_PATTERN.test(productId) ||
    !altText ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_MEDIA_BYTES
  ) {
    redirect("/admin/products?error=invalid");
  }

  const { supabase } = await requireStaff();
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMime(signature);
  if (!detected || detected !== file.type) redirect(`/admin/products/${productId}?error=media`);

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });

  if (uploadError) redirect(`/admin/products/${productId}?error=media`);
  const { error: metadataError } = await supabase.from("product_media").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: altText,
    media_type: "image",
  });

  if (metadataError) {
    await supabase.storage.from("product-media").remove([storagePath]);
    redirect(`/admin/products/${productId}?error=media`);
  }

  revalidateCatalogue(productId);
  redirect(`/admin/products/${productId}?media=uploaded`);
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
    redirect("/admin/products?error=invalid");
  }
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("archive_product_media", {
    p_media_id: mediaId,
    p_product_id: productId,
  });
  if (error) redirect(`/admin/products/${productId}?error=media`);
  revalidateCatalogue(productId);
  redirect(`/admin/products/${productId}?media=archived`);
}

function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
  ) {
    return "image/avif";
  }
  return null;
}

function revalidateCatalogue(productId: string): void {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}
