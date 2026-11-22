"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

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
