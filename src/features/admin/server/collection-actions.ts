"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { formText, integer } from "./form-values";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveCollection(formData: FormData): Promise<never> {
  const collectionId = formData.get("collection_id");
  const name = formText(formData, "name", 120);
  const slugInput = formText(formData, "slug", 100);
  const description = formText(formData, "description", 2_000);
  const sortOrder = integer(formText(formData, "sort_order", 12));
  const status = formData.get("status");
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
  const result =
    typeof collectionId === "string" && collectionId
      ? await supabase
          .from("collections")
          .update({ name, slug, description, sort_order: sortOrder, status })
          .eq("id", collectionId)
      : await supabase
          .from("collections")
          .insert({ name, slug, description, sort_order: sortOrder, status });

  if (result.error) redirect("/admin/collections?error=save");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/collections?saved=1");
}
