import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export type StaffRole = "owner" | "staff";

export async function requireStaff(roles: readonly StaffRole[] = ["owner", "staff"]) {
  if (!isSupabaseServerConfigured()) redirect("/admin/login?error=setup");

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/admin/login");

  const { data: membership, error: membershipError } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) redirect("/admin/login?error=unauthorized");
  if (!roles.includes(membership.role)) redirect("/admin?error=forbidden");

  return { supabase, user: userData.user, role: membership.role };
}
