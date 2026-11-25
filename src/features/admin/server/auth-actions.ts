"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireStaff } from "./access";

export async function signInAdmin(formData: FormData): Promise<never> {
  if (!isSupabaseServerConfigured()) redirect("/admin/login?error=setup");

  const email = formData.get("email");
  const password = formData.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim().length === 0 ||
    email.length > 254 ||
    password.length === 0 ||
    password.length > 1_024
  ) {
    redirect("/admin/login?error=credentials");
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (signInError) redirect("/admin/login?error=credentials");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=credentials");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("staff_members")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  redirect("/admin");
}

export async function signOutAdmin(): Promise<never> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

export async function changeAdminPassword(formData: FormData): Promise<never> {
  const { supabase, user } = await requireStaff();
  const currentPassword = formData.get("current_password");
  const newPassword = formData.get("new_password");
  const confirmPassword = formData.get("confirm_password");

  if (
    !user.email ||
    typeof currentPassword !== "string" ||
    currentPassword.length === 0 ||
    currentPassword.length > 1_024 ||
    typeof newPassword !== "string" ||
    newPassword.length < 12 ||
    newPassword.length > 128 ||
    typeof confirmPassword !== "string" ||
    newPassword !== confirmPassword
  ) {
    redirect("/admin/security?error=invalid");
  }

  const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthenticationError) redirect("/admin/security?error=current");

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) redirect("/admin/security?error=update");

  redirect("/admin/security?status=updated");
}
