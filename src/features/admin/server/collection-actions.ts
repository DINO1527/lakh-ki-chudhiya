"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { logAdminActionFailure } from "./action-logger";
import { formText, integer, validUuid } from "./form-values";
import { detectImageMime } from "./media-validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const MAX_COLLECTION_IMAGES = 20;

function collectionResultLocation(query: string, collectionId?: string): string {
  return collectionId
    ? `/admin/collections?${query}&open=${collectionId}#collection-${collectionId}`
    : `/admin/collections?${query}`;
}

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
    if (detailsError) {
      logAdminActionFailure("saveCollection.details", "collections", detailsError.code);
      redirect(collectionResultLocation("error=save", existingCollectionId));
    }

    const { error: publishError } = await supabase.rpc("publish_collection", {
      p_collection_id: existingCollectionId,
    });
    if (publishError) {
      logAdminActionFailure("saveCollection.publish", "collections", publishError.code);
      redirect(collectionResultLocation("error=image_required", existingCollectionId));
    }

    revalidateCollectionPages();
    redirect(collectionResultLocation("saved=1", existingCollectionId));
  }

  if (!existingCollectionId) {
    const { data: created, error } = await supabase
      .from("collections")
      .insert({ name, slug, description, sort_order: sortOrder, status: "draft" })
      .select("id")
      .single();
    if (error || !created) {
      logAdminActionFailure("saveCollection.create", "collections", error?.code);
      redirect("/admin/collections?error=save");
    }

    revalidateCollectionPages();
    redirect(`/admin/collections?created=${created.id}#collection-${created.id}`);
  }

  const { error } = await supabase
    .from("collections")
    .update({ name, slug, description, sort_order: sortOrder, status })
    .eq("id", existingCollectionId);
  if (error) {
    logAdminActionFailure("saveCollection.update", "collections", error.code);
    redirect(collectionResultLocation("error=save", existingCollectionId));
  }
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect(collectionResultLocation("saved=1", existingCollectionId));
}

export async function toggleCollectionPublication(formData: FormData): Promise<never> {
  const collectionId = formText(formData, "collection_id", 36);
  const nextStatus = formData.get("next_status");
  if (!validUuid(collectionId) || (nextStatus !== "draft" && nextStatus !== "published")) {
    redirect(collectionListLocation(formData, "error", "invalid"));
  }

  const { supabase } = await requireStaff();
  if (nextStatus === "published") {
    const { error } = await supabase.rpc("publish_collection", {
      p_collection_id: collectionId,
    });
    if (error) {
      logAdminActionFailure("toggleCollectionPublication.publish", "collections", error.code);
      const errorType =
        error.code === "22023"
          ? "image_required"
          : error.code === "42501"
            ? "permission"
            : error.code === "P0002"
              ? "missing_record"
              : "save";
      redirect(collectionListLocation(formData, "error", errorType, collectionId));
    }
  } else {
    const { data, error } = await supabase
      .from("collections")
      .update({ status: "draft" })
      .eq("id", collectionId)
      .eq("status", "published")
      .select("id")
      .maybeSingle();
    if (error || !data) {
      if (error)
        logAdminActionFailure("toggleCollectionPublication.draft", "collections", error.code);
      const errorType =
        error?.code === "42501"
          ? "permission"
          : error?.code === "P0002" || !data
            ? "missing_record"
            : "save";
      redirect(collectionListLocation(formData, "error", errorType, collectionId));
    }
  }

  revalidateCollectionPages();
  redirect(collectionListLocation(formData, "changed", nextStatus, collectionId));
}

function collectionListLocation(
  formData: FormData,
  resultKey: "changed" | "error",
  result: string,
  collectionId?: string,
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
  if (collectionId) query.set("open", collectionId);
  query.set(resultKey, result);
  return collectionId
    ? `/admin/collections?${query.toString()}#collection-${collectionId}`
    : `/admin/collections?${query.toString()}`;
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
  if (!detected || detected !== file.type) {
    redirect(collectionResultLocation("error=image", collectionId));
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .maybeSingle();
  if (!collection) redirect(collectionResultLocation("error=image", collectionId));

  const { count, error: countError } = await supabase
    .from("collection_media")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collectionId)
    .neq("status", "archived");
  if (countError || (count ?? 0) >= MAX_COLLECTION_IMAGES) {
    if (countError) {
      logAdminActionFailure("uploadCollectionImage.count", "collection_media", countError.code);
    }
    redirect(collectionResultLocation("error=image_limit", collectionId));
  }

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `collections/${collectionId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });
  if (uploadError) {
    logAdminActionFailure("uploadCollectionImage.storage", "product-media", uploadError.name);
    redirect(collectionResultLocation("error=image", collectionId));
  }

  const { error: metadataError } = await supabase.from("collection_media").insert({
    collection_id: collectionId,
    storage_path: storagePath,
    alt_text: altText,
    sort_order: sortOrder,
  });
  if (metadataError) {
    logAdminActionFailure("uploadCollectionImage.metadata", "collection_media", metadataError.code);
    const { error: cleanupError } = await supabase.storage
      .from("product-media")
      .remove([storagePath]);
    if (cleanupError) {
      logAdminActionFailure("uploadCollectionImage.cleanup", "product-media", cleanupError.name);
    }
    redirect(collectionResultLocation("error=image", collectionId));
  }

  revalidateCollectionPages();
  redirect(collectionResultLocation("image=uploaded", collectionId));
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
    logAdminActionFailure("archiveCollectionImage", "collection_media", error.code);
    redirect(
      collectionResultLocation(
        `error=${error.code === "23514" ? "last_image" : "image"}`,
        collectionId,
      ),
    );
  }

  revalidateCollectionPages();
  redirect(collectionResultLocation("image=archived", collectionId));
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
  if (error) {
    logAdminActionFailure("updateCollectionImage", "collection_media", error.code);
    redirect(collectionResultLocation("error=image", rawCollectionId));
  }

  revalidateCollectionPages();
  redirect(collectionResultLocation("image=updated", rawCollectionId));
}

function revalidateCollectionPages(): void {
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/collections");
}
