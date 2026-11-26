import "server-only";
import { requireStaff } from "./access";
import { logAdminQueryFailure } from "./action-logger";

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
  if (products.error) logAdminQueryFailure("overviewProducts", "products", products.error.code);
  if (drafts.error) logAdminQueryFailure("overviewDrafts", "products", drafts.error.code);
  if (variants.error)
    logAdminQueryFailure("overviewVariants", "product_variants", variants.error.code);
  if (unavailable.error)
    logAdminQueryFailure("overviewUnavailable", "product_variants", unavailable.error.code);
  if (orders.error) logAdminQueryFailure("overviewOrders", "orders", orders.error.code);
  if (pendingOrders.error)
    logAdminQueryFailure("overviewPendingOrders", "orders", pendingOrders.error.code);
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
