"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { logAdminActionFailure } from "./action-logger";
import { formText, validUuid } from "./form-values";
import { detectImageMime } from "./media-validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const MAX_COLLECTION_IMAGES = 20;

export async function saveCollection(formData: FormData): Promise<never> {
  const collectionId = formData.get("collection_id");
  const name = formText(formData, "name", 120);
  const slugInput = formText(formData, "slug", 100);
  const description = formText(formData, "description", 2_000);
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
    (status !== "draft" && status !== "published" && status !== "archived") ||
    (collectionId !== null && typeof collectionId !== "string") ||
    (typeof collectionId === "string" && collectionId !== "" && !UUID_PATTERN.test(collectionId))
  ) {
    redirect(
      existingCollectionId
        ? collectionResultUrl(existingCollectionId, "error", "invalid")
        : "/admin/collections?error=invalid",
    );
  }

  const { supabase } = await requireStaff();
  if (status === "published" && existingCollectionId) {
    const { data: details, error: detailsError } = await supabase
      .from("collections")
      .update({ name, slug, description })
      .eq("id", existingCollectionId)
      .select("id")
      .maybeSingle();
    if (detailsError || !details) {
      logAdminActionFailure("saveCollection.details", "collections", detailsError?.code);
      redirect(collectionResultUrl(existingCollectionId, "error", "save"));
    }

    const { error: publishError } = await supabase.rpc("publish_collection", {
      p_collection_id: existingCollectionId,
    });
    if (publishError) {
      logAdminActionFailure("saveCollection.publish", "collections", publishError.code);
      redirect(collectionResultUrl(existingCollectionId, "error", "image_required"));
    }

    revalidateCollectionPages();
    redirect(collectionResultUrl(existingCollectionId, "saved", "1"));
  }

  if (!existingCollectionId) {
    const { data: createdId, error } = await supabase.rpc("create_collection_draft", {
      p_name: name,
      p_slug: slug,
      p_description: description,
    });
    if (error || !createdId) {
      logAdminActionFailure("saveCollection.create", "collections", error?.code);
      redirect("/admin/collections?error=save");
    }

    revalidateCollectionPages();
    redirect(`/admin/collections?created=${createdId}#collection-${createdId}`);
  }

  const { data: updated, error } = await supabase
    .from("collections")
    .update({ name, slug, description, status })
    .eq("id", existingCollectionId)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    logAdminActionFailure("saveCollection.update", "collections", error?.code);
    redirect(collectionResultUrl(existingCollectionId, "error", "save"));
  }
  revalidateCollectionPages();
  redirect(collectionResultUrl(existingCollectionId, "saved", "1"));
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
  const returnCollectionId =
    typeof rawCollectionId === "string" && validUuid(rawCollectionId) ? rawCollectionId : null;
  const altText = formText(formData, "alt_text", 250);
  const file = formData.get("file");
  if (
    typeof rawCollectionId !== "string" ||
    !validUuid(rawCollectionId) ||
    !altText ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_MEDIA_BYTES
  ) {
    redirect(
      returnCollectionId
        ? collectionResultUrl(returnCollectionId, "error", "image")
        : "/admin/collections?error=image",
    );
  }
  const collectionId = rawCollectionId;

  const { supabase } = await requireStaff();
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMime(signature);
  if (!detected || detected !== file.type) {
    redirect(collectionResultUrl(collectionId, "error", "image"));
  }

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .maybeSingle();
  if (collectionError || !collection) {
    if (collectionError)
      logAdminActionFailure(
        "uploadCollectionImage.collection",
        "collections",
        collectionError.code,
      );
    redirect(collectionResultUrl(collectionId, "error", "image"));
  }

  const { count, error: countError } = await supabase
    .from("collection_media")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collectionId)
    .neq("status", "archived");
  if (countError) {
    logAdminActionFailure("uploadCollectionImage.count", "collection_media", countError.code);
    redirect(collectionResultUrl(collectionId, "error", "image"));
  }
  if ((count ?? 0) >= MAX_COLLECTION_IMAGES) {
    redirect(collectionResultUrl(collectionId, "error", "image_limit"));
  }

  const extension = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const storagePath = `collections/${collectionId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, file, { contentType: detected, upsert: false, cacheControl: "3600" });
  if (uploadError) {
    logAdminActionFailure("uploadCollectionImage.storage", "product-media", uploadError.name);
    redirect(collectionResultUrl(collectionId, "error", "image"));
  }

  const { error: metadataError } = await supabase.rpc("add_collection_media", {
    p_collection_id: collectionId,
    p_storage_path: storagePath,
    p_alt_text: altText,
  });
  if (metadataError) {
    logAdminActionFailure("uploadCollectionImage.metadata", "collection_media", metadataError.code);
    const { error: cleanupError } = await supabase.storage
      .from("product-media")
      .remove([storagePath]);
    if (cleanupError) {
      logAdminActionFailure("uploadCollectionImage.cleanup", "product-media", cleanupError.name);
    }
    redirect(
      collectionResultUrl(
        collectionId,
        "error",
        metadataError.code === "23514" &&
          metadataError.message === "A collection can have at most 20 active images"
          ? "image_limit"
          : "image",
      ),
    );
  }

  revalidateCollectionPages();
  redirect(collectionResultUrl(collectionId, "image", "uploaded"));
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
      collectionResultUrl(collectionId, "error", error.code === "23514" ? "last_image" : "image"),
    );
  }

  revalidateCollectionPages();
  redirect(collectionResultUrl(collectionId, "image", "archived"));
}

export async function updateCollectionImage(formData: FormData): Promise<never> {
  const rawCollectionId = formData.get("collection_id");
  const rawMediaId = formData.get("media_id");
  const altText = formText(formData, "alt_text", 250);
  if (
    typeof rawCollectionId !== "string" ||
    !validUuid(rawCollectionId) ||
    typeof rawMediaId !== "string" ||
    !validUuid(rawMediaId) ||
    !altText
  ) {
    redirect("/admin/collections?error=image");
  }

  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("collection_media")
    .update({ alt_text: altText })
    .eq("id", rawMediaId)
    .eq("collection_id", rawCollectionId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    logAdminActionFailure("updateCollectionImage", "collection_media", error?.code);
    redirect(collectionResultUrl(rawCollectionId, "error", "image"));
  }

  revalidateCollectionPages();
  redirect(collectionResultUrl(rawCollectionId, "image", "updated"));
}

export async function moveCollectionOrder(formData: FormData): Promise<never> {
  const collectionId = formText(formData, "collection_id", 36);
  const direction = formText(formData, "direction", 4);
  if (!validUuid(collectionId) || (direction !== "up" && direction !== "down")) {
    redirect("/admin/collections?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { data: moved, error } = await supabase.rpc("move_collection_order", {
    p_collection_id: collectionId,
    p_direction: direction,
  });
  if (error) {
    logAdminActionFailure("moveCollectionOrder", "collections", error.code);
    redirect(collectionResultUrl(collectionId, "error", "order"));
  }

  revalidateCollectionPages();
  redirect(
    collectionResultUrl(
      collectionId,
      "order",
      moved ? "updated" : direction === "up" ? "first" : "last",
    ),
  );
}

export async function moveCollectionImageOrder(formData: FormData): Promise<never> {
  const collectionId = formText(formData, "collection_id", 36);
  const mediaId = formText(formData, "media_id", 36);
  const direction = formText(formData, "direction", 4);
  if (
    !validUuid(collectionId) ||
    !validUuid(mediaId) ||
    (direction !== "up" && direction !== "down")
  ) {
    redirect("/admin/collections?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { data: moved, error } = await supabase.rpc("move_collection_media_order", {
    p_collection_id: collectionId,
    p_media_id: mediaId,
    p_direction: direction,
  });
  if (error) {
    logAdminActionFailure("moveCollectionImageOrder", "collection_media", error.code);
    redirect(collectionResultUrl(collectionId, "error", "order"));
  }

  revalidateCollectionPages();
  redirect(
    collectionResultUrl(
      collectionId,
      "order",
      moved ? "updated" : direction === "up" ? "first" : "last",
    ),
  );
}

function collectionResultUrl(
  collectionId: string,
  parameter: "error" | "image" | "order" | "saved",
  value: string,
): string {
  const query = new URLSearchParams({ open: collectionId, [parameter]: value });
  return "/admin/collections?" + query.toString() + "#collection-" + collectionId;
}

function revalidateCollectionPages(): void {
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/collections");
}
