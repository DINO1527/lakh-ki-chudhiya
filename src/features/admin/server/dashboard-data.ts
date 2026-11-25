import "server-only";
import { requireStaff } from "./access";

export async function getAdminOverview() {
  const { supabase } = await requireStaff();
  const [products, drafts, variants, unavailable, orders, pendingOrders] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_available", false),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_confirmation"),
  ]);

  const failed = [products, drafts, variants, unavailable, orders, pendingOrders].some(
    (result) => result.error,
  );
  return {
    status: failed ? "error" : "ready",
    productCount: products.count ?? 0,
    draftCount: drafts.count ?? 0,
    variantCount: variants.count ?? 0,
    unavailableCount: unavailable.count ?? 0,
    orderCount: orders.count ?? 0,
    pendingOrderCount: pendingOrders.count ?? 0,
  } as const;
}
