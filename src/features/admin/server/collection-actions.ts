"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { formText, integer, validUuid } from "./form-values";
import { detectImageMime } from "./media-validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const MAX_COLLECTION_IMAGES = 20;

export async function saveCollection(formData: FormData): Promise<never> {
  const collectionId = formData.get("collection_id");
  const name = formText(formData, "name", 120);
  const slugInput = formText(formData, "slug", 100);
  const description = formText(formData, "description", 2_000);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  const existingCollectionId =
    typeof collectionId === "string" && collectionId !== "" ? collectionId : null;
  const status = existingCollectionId ? formData.get("status") : "draft";
  const slug = (slugInput || name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (
    !name ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    description === null ||
    sortOrder === null ||
    (status !== "draft" && status !== "published" && status !== "archived") ||
    (collectionId !== null && typeof collectionId !== "string") ||
    (typeof collectionId === "string" && collectionId !== "" && !UUID_PATTERN.test(collectionId))
  ) {
    redirect("/admin/collections?error=invalid");
  }

  const { supabase } = await requireStaff();
  if (status === "published" && existingCollectionId) {
    const { error: detailsError } = await supabase
      .from("collections")
      .update({ name, slug, description, sort_order: sortOrder })
      .eq("id", existingCollectionId);
    if (detailsError) redirect("/admin/collections?error=save");

    const { error: publishError } = await supabase.rpc("publish_collection", {
      p_collection_id: existingCollectionId,
    });
    if (publishError) redirect("/admin/collections?error=image_required");

    revalidateCollectionPages();
    redirect("/admin/collections?saved=1");
  }

  const result = existingCollectionId
    ? await supabase
        .from("collections")
        .update({ name, slug, description, sort_order: sortOrder, status })
        .eq("id", existingCollectionId)
    : await supabase
        .from("collections")
        .insert({ name, slug, description, sort_order: sortOrder, status: "draft" });

  if (result.error) redirect("/admin/collections?error=save");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/collections?saved=1");
}

export async function uploadCollectionImage(formData: FormData): Promise<never> {
  const rawCollectionId = formData.get("collection_id");
  const altText = formText(formData, "alt_text", 250);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  const file = formData.get("file");
  if (
    typeof rawCollectionId !== "string" ||
    !validUuid(rawCollectionId) ||
    !altText ||
    sortOrder === null ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_MEDIA_BYTES
  ) {
    redirect("/admin/collections?error=image");
  }
  const collectionId = rawCollectionId;

  const { supabase } = await requireStaff();
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMime(signature);
  if (!detected || detected !== file.type) redirect("/admin/collections?error=image");

  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .maybeSingle();
  if (!collection) redirect("/admin/collections?error=image");

  const { count, error: countError } = await supabase
    .from("collection_media")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collectionId)
    .neq("status", "archived");
  if (countError || (count ?? 0) >= MAX_COLLECTION_IMAGES) {
    redirect("/admin/collections?error=image_limit");
  }

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `collections/${collectionId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });
  if (uploadError) redirect("/admin/collections?error=image");

  const { error: metadataError } = await supabase.from("collection_media").insert({
    collection_id: collectionId,
    storage_path: storagePath,
    alt_text: altText,
    sort_order: sortOrder,
  });
  if (metadataError) {
    await supabase.storage.from("product-media").remove([storagePath]);
    redirect("/admin/collections?error=image");
  }

  revalidateCollectionPages();
  redirect("/admin/collections?saved=1&image=uploaded");
}

export async function archiveCollectionImage(formData: FormData): Promise<never> {
  const rawCollectionId = formData.get("collection_id");
  const rawMediaId = formData.get("media_id");
  if (
    typeof rawCollectionId !== "string" ||
    !validUuid(rawCollectionId) ||
    typeof rawMediaId !== "string" ||
    !validUuid(rawMediaId)
  ) {
    redirect("/admin/collections?error=invalid");
  }
  const collectionId = rawCollectionId;
  const mediaId = rawMediaId;

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("archive_collection_media", {
    p_media_id: mediaId,
    p_collection_id: collectionId,
  });
  if (error) {
    redirect(`/admin/collections?error=${error.code === "23514" ? "last_image" : "image"}`);
  }

  revalidateCollectionPages();
  redirect("/admin/collections?saved=1&image=archived");
}

export async function updateCollectionImage(formData: FormData): Promise<never> {
  const rawCollectionId = formData.get("collection_id");
  const rawMediaId = formData.get("media_id");
  const altText = formText(formData, "alt_text", 250);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  if (
    typeof rawCollectionId !== "string" ||
    !validUuid(rawCollectionId) ||
    typeof rawMediaId !== "string" ||
    !validUuid(rawMediaId) ||
    !altText ||
    sortOrder === null
  ) {
    redirect("/admin/collections?error=image");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("collection_media")
    .update({ alt_text: altText, sort_order: sortOrder })
    .eq("id", rawMediaId)
    .eq("collection_id", rawCollectionId);
  if (error) redirect("/admin/collections?error=image");

  revalidateCollectionPages();
  redirect("/admin/collections?saved=1&image=updated");
}

function revalidateCollectionPages(): void {
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/collections");
}
