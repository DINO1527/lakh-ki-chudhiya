import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function requireCustomer(returnTo = "/account") {
  if (!isSupabaseServerConfigured()) redirect("/account/login?error=setup");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const safeReturnTo = returnTo.startsWith("/account") ? returnTo : "/account";
    redirect(`/account/login?next=${encodeURIComponent(safeReturnTo)}`);
  }
  return { supabase, user: data.user };
}
