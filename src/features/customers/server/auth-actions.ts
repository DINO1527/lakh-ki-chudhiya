"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireCustomer } from "./access";

export async function signInCustomer(formData: FormData): Promise<never> {
  if (!isSupabaseServerConfigured()) redirect("/account/login?error=setup");
  const email = formData.get("email");
  const password = formData.get("password");
  const next = safeAccountPath(formData.get("next"));
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 1_024
  ) {
    redirect(`/account/login?error=credentials&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) redirect(`/account/login?error=credentials&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function registerCustomer(formData: FormData): Promise<never> {
  if (!isSupabaseServerConfigured()) redirect("/account/register?error=setup");
  const email = formData.get("email");
  const password = formData.get("password");
  const fullName = formData.get("full_name");
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128 ||
    typeof fullName !== "string" ||
    fullName.trim().length < 1 ||
    fullName.length > 120
  ) {
    redirect("/account/register?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const origin = safeRequestOrigin(await headers());
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      ...(origin ? { emailRedirectTo: `${origin}/auth/callback?next=%2Faccount` } : {}),
    },
  });
  if (error) redirect("/account/register?error=registration");
  if (data.session) redirect("/account");
  redirect("/account/register?status=check-email");
}

export async function requestCustomerPasswordReset(formData: FormData): Promise<never> {
  if (!isSupabaseServerConfigured()) redirect("/account/forgot-password?error=setup");
  const email = formData.get("email");
  if (typeof email !== "string" || email.length > 254 || !email.includes("@")) {
    redirect("/account/forgot-password?status=sent");
  }

  const supabase = await createSupabaseServerClient();
  const origin = safeRequestOrigin(await headers());
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    ...(origin ? { redirectTo: `${origin}/auth/callback?next=%2Faccount%2Freset-password` } : {}),
  });
  redirect("/account/forgot-password?status=sent");
}

export async function signOutCustomer(): Promise<never> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/account/login?status=signed-out");
}

export async function updateCustomerProfile(formData: FormData): Promise<never> {
  const { supabase, user } = await requireCustomer("/account/profile");
  const fullName = formData.get("full_name");
  const phone = formData.get("phone");
  if (
    typeof fullName !== "string" ||
    fullName.trim().length < 1 ||
    fullName.length > 120 ||
    typeof phone !== "string" ||
    phone.length > 40
  ) {
    redirect("/account/profile?error=invalid");
  }

  const { error } = await supabase
    .from("customer_profiles")
    .update({ full_name: fullName.trim(), phone: phone.trim() })
    .eq("user_id", user.id);
  if (error) redirect("/account/profile?error=save");
  redirect("/account/profile?status=saved");
}

export async function updateCustomerPassword(formData: FormData): Promise<never> {
  const { supabase, user } = await requireCustomer("/account/security");
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
    redirect("/account/security?error=invalid");
  }

  const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthenticationError) redirect("/account/security?error=current");
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) redirect("/account/security?error=update");
  redirect("/account/security?status=updated");
}

export async function setPasswordFromRecovery(formData: FormData): Promise<never> {
  if (!isSupabaseServerConfigured()) redirect("/account/reset-password?error=setup");
  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  const newPassword = formData.get("new_password");
  const confirmPassword = formData.get("confirm_password");
  if (
    userError ||
    !data.user ||
    typeof newPassword !== "string" ||
    newPassword.length < 12 ||
    newPassword.length > 128 ||
    typeof confirmPassword !== "string" ||
    newPassword !== confirmPassword
  ) {
    redirect("/account/reset-password?error=invalid");
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) redirect("/account/reset-password?error=update");
  redirect("/account?status=password-updated");
}

function safeAccountPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/account";
  if (["/account", "/cart", "/checkout"].includes(value)) return value;
  if (/^\/account\/orders(?:\/[A-Z0-9-]+)?$/.test(value)) return value;
  return "/account";
}

function safeRequestOrigin(requestHeaders: Headers): string | null {
  const rawOrigin = requestHeaders.get("origin");
  if (!rawOrigin) return null;
  try {
    const origin = new URL(rawOrigin);
    if (origin.protocol !== "https:" && origin.hostname !== "localhost") return null;
    return origin.origin;
  } catch {
    return null;
  }
}
