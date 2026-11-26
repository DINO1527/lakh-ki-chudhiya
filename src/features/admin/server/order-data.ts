import "server-only";
import { requireStaff } from "./access";
import { logAdminQueryFailure } from "./action-logger";

const PAGE_SIZE = 20;

export async function getAdminOrders({ page, search }: Readonly<{ page: number; search: string }>) {
  const { supabase } = await requireStaff();
  let query = supabase
    .from("orders")
    .select(
      "id, reference, customer_id, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_postal_code, delivery_note, subtotal_minor, discount_minor, delivery_fee_minor, total_minor, status, payment_status, payment_method, offer_name_snapshot, offer_discount_basis_points, payment_refunded_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (search) query = query.ilike("reference", `%${search}%`);
  const {
    data: orders,
    error,
    count,
  } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) {
    logAdminQueryFailure("loadOrders", "orders", error.code);
    return { status: "error", orders: [], total: 0 } as const;
  }
  if (!orders || orders.length === 0)
    return { status: "ready", orders: [], total: count ?? 0 } as const;

  const orderIds = orders.map((order) => order.id);
  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_title, sku, variant_label, unit_price_minor, quantity, set_count_snapshot, line_total_minor",
    )
    .in("order_id", orderIds)
    .order("id", { ascending: true });
  if (itemError) {
    logAdminQueryFailure("loadOrderItems", "order_items", itemError.code);
    return { status: "error", orders: [], total: 0 } as const;
  }

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push(item);
    itemsByOrder.set(item.order_id, current);
  }
  return {
    status: "ready",
    orders: orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] })),
    total: count ?? 0,
  } as const;
}
