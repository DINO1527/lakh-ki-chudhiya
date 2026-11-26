import "server-only";
import { requireStaff } from "./access";
import { logAdminQueryFailure } from "./action-logger";

export async function getAdminCustomers() {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "customer_id, customer_name, customer_email, customer_phone, reference, status, created_at",
    )
    .not("customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    logAdminQueryFailure("loadCustomers", "orders", error.code);
    return { status: "error", customers: [] } as const;
  }

  const customers = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      phone: string;
      orderCount: number;
      lastOrderReference: string;
      lastOrderStatus: string;
      lastOrderAt: string;
    }
  >();
  for (const order of data ?? []) {
    if (!order.customer_id) continue;
    const existing = customers.get(order.customer_id);
    if (existing) {
      existing.orderCount += 1;
      continue;
    }
    customers.set(order.customer_id, {
      userId: order.customer_id,
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      orderCount: 1,
      lastOrderReference: order.reference,
      lastOrderStatus: order.status,
      lastOrderAt: order.created_at,
    });
  }

  return {
    status: "ready",
    customers: [...customers.values()],
  } as const;
}
