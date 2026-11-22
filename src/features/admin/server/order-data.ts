import "server-only";
import { requireStaff } from "./access";

export async function getAdminOrders() {
  const { supabase } = await requireStaff();
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, reference, customer_id, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_postal_code, delivery_note, subtotal_minor, delivery_fee_minor, total_minor, status, payment_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { status: "error", orders: [] } as const;
  if (!orders || orders.length === 0) return { status: "ready", orders: [] } as const;

  const orderIds = orders.map((order) => order.id);
  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_title, sku, variant_label, unit_price_minor, quantity, line_total_minor",
    )
    .in("order_id", orderIds)
    .order("id", { ascending: true });
  if (itemError) return { status: "error", orders: [] } as const;

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push(item);
    itemsByOrder.set(item.order_id, current);
  }
  return {
    status: "ready",
    orders: orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] })),
  } as const;
}
