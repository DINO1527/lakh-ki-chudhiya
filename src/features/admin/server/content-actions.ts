"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { formText } from "./form-values";

export async function saveHomepageContent(formData: FormData): Promise<never> {
  const eyebrow = formText(formData, "eyebrow", 120);
  const title = formText(formData, "title", 160);
  const body = formText(formData, "body", 4_000);
  const ctaLabel = formText(formData, "cta_label", 80);
  const ctaHref = formText(formData, "cta_href", 300);
  const status = formData.get("status");
  if (
    eyebrow === null ||
    !title ||
    body === null ||
    ctaLabel === null ||
    ctaHref === null ||
    (ctaHref !== "" && !/^\/(?!\/)[A-Za-z0-9/_-]*$/.test(ctaHref)) ||
    (status !== "draft" && status !== "published" && status !== "archived")
  ) {
    redirect("/admin/content?error=invalid");
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("set_homepage_content", {
    p_eyebrow: eyebrow,
    p_title: title,
    p_body: body,
    p_cta_label: ctaLabel,
    p_cta_href: ctaHref,
    p_status: status,
  });
  if (error) redirect("/admin/content?error=save");
  revalidatePath("/");
  redirect("/admin/content?saved=1");
}
