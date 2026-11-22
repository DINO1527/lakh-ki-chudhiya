import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { GUEST_ORDER_ACCESS_COOKIE, hashGuestOrderAccessToken } from "./guest-access";

export type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "processing"
  | "packed"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type OrderSummary = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postal_code: string;
  delivery_note: string;
  subtotal_minor: number;
  delivery_fee_minor: number | null;
  total_minor: number | null;
  status: OrderStatus;
  payment_status: string;
  created_at: string;
  items: {
    id: string;
    product_title: string;
    variant_label: string;
    unit_price_minor: number;
    quantity: number;
    line_total_minor: number;
  }[];
};

export type OrderSummaryResult =
  | { status: "ready"; order: OrderSummary }
  | { status: "not_found" }
  | { status: "error" };

const ORDER_SELECT =
  "id, reference, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_postal_code, delivery_note, subtotal_minor, delivery_fee_minor, total_minor, status, payment_status, created_at";

export async function getOrderSummaryByReference(reference: string): Promise<OrderSummaryResult> {
  if (!/^[A-Z0-9-]{8,32}$/.test(reference) || !isSupabaseServerConfigured()) {
    return { status: "not_found" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && userError.name !== "AuthSessionMissingError") return { status: "error" };

  if (userData.user) {
    const { data: order, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("reference", reference)
      .maybeSingle();
    if (error) return { status: "error" };
    if (order) {
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("id, product_title, variant_label, unit_price_minor, quantity, line_total_minor")
        .eq("order_id", order.id)
        .order("id", { ascending: true });
      if (itemsError) return { status: "error" };
      return { status: "ready", order: { ...order, items: items ?? [] } };
    }
  }

  const token = (await cookies()).get(GUEST_ORDER_ACCESS_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return { status: "not_found" };
  const accessHash = await hashGuestOrderAccessToken(token);
  const { data, error } = await supabase.rpc("get_guest_order", {
    p_reference: reference,
    p_access_hash: accessHash,
  });
  if (error) return { status: "error" };
  const parsed = parseGuestSummary(data);
  return parsed ? { status: "ready", order: parsed } : { status: "not_found" };
}

function parseGuestSummary(value: unknown): OrderSummary | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const rawOrder = record.order;
  const rawItems = record.items;
  if (
    typeof rawOrder !== "object" ||
    rawOrder === null ||
    Array.isArray(rawOrder) ||
    !Array.isArray(rawItems)
  ) {
    return null;
  }

  const order = rawOrder as Record<string, unknown>;
  const requiredStrings = [
    "id",
    "reference",
    "customer_name",
    "customer_email",
    "customer_phone",
    "delivery_address",
    "delivery_city",
    "delivery_postal_code",
    "delivery_note",
    "status",
    "payment_status",
    "created_at",
  ] as const;
  if (requiredStrings.some((field) => typeof order[field] !== "string")) return null;
  if (!Number.isSafeInteger(order.subtotal_minor)) return null;

  const items = rawItems.flatMap((rawItem) => {
    if (typeof rawItem !== "object" || rawItem === null || Array.isArray(rawItem)) return [];
    const item = rawItem as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.product_title !== "string" ||
      typeof item.variant_label !== "string" ||
      !Number.isSafeInteger(item.unit_price_minor) ||
      !Number.isSafeInteger(item.quantity) ||
      !Number.isSafeInteger(item.line_total_minor)
    )
      return [];
    return [
      {
        id: item.id,
        product_title: item.product_title,
        variant_label: item.variant_label,
        unit_price_minor: item.unit_price_minor as number,
        quantity: item.quantity as number,
        line_total_minor: item.line_total_minor as number,
      },
    ];
  });
  if (items.length !== rawItems.length || items.length === 0) return null;

  return {
    ...(order as unknown as Omit<OrderSummary, "items">),
    subtotal_minor: order.subtotal_minor as number,
    delivery_fee_minor:
      typeof order.delivery_fee_minor === "number" ? order.delivery_fee_minor : null,
    total_minor: typeof order.total_minor === "number" ? order.total_minor : null,
    status: order.status as OrderStatus,
    items,
  };
}
