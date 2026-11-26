"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "./access";
import { logAdminActionFailure } from "./action-logger";
import { formText, validRole, validUuid } from "./form-values";

export async function saveStaffMember(formData: FormData): Promise<never> {
  const userId = formText(formData, "user_id", 36);
  const role = formText(formData, "role", 8);
  const isActiveValue = formData.get("is_active");
  if (
    !validUuid(userId) ||
    !validRole(role) ||
    (isActiveValue !== "active" && isActiveValue !== "inactive")
  ) {
    redirect("/admin/team?error=invalid");
  }

  const { supabase } = await requireStaff(["owner"]);
  const { error } = await supabase.rpc("manage_staff_member", {
    p_user_id: userId,
    p_role: role,
    p_is_active: isActiveValue === "active",
  });
  if (error) {
    logAdminActionFailure("saveStaffMember", "staff_members", error.code);
    redirect("/admin/team?error=save");
  }
  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}
