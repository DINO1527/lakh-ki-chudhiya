// Keep in sync with the checked-in catalogue migration. Replace with
// `supabase gen types typescript` output when the approved CLI is available.
type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type CollectionStatus = "draft" | "published" | "archived";
type ProductStatus = "draft" | "published" | "archived";
type ProductMediaType = "image" | "video" | "model";
type InventoryMovementType = "adjustment" | "reserved" | "released" | "dispatched" | "restocked";
type AdminResourceType =
  | "product"
  | "product_variant"
  | "collection"
  | "product_media"
  | "site_content"
  | "staff_member";
type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "processing"
  | "packed"
  | "dispatched"
  | "delivered"
  | "cancelled";
type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      stage0_smoke: TableDefinition<{
        id: string;
        label: string;
        created_at: string;
      }>;
      collections: TableDefinition<{
        id: string;
        slug: string;
        name: string;
        description: string;
        status: CollectionStatus;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }>;
      products: TableDefinition<{
        id: string;
        slug: string;
        title: string;
        description: string;
        material: string;
        care_instructions: string;
        set_count: number;
        status: ProductStatus;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }>;
      product_collections: TableDefinition<{
        product_id: string;
        collection_id: string;
        created_at: string;
      }>;
      product_variants: TableDefinition<{
        id: string;
        product_id: string;
        sku: string;
        size_code: string | null;
        inner_diameter_mm: number | null;
        colour_name: string;
        price_minor: number;
        compare_at_price_minor: number | null;
        stock_on_hand: number;
        reserved_quantity: number;
        is_active: boolean;
        is_available: boolean;
        created_at: string;
        updated_at: string;
      }>;
      product_media: TableDefinition<{
        id: string;
        product_id: string;
        variant_id: string | null;
        storage_path: string;
        alt_text: string;
        media_type: ProductMediaType;
        status: ProductStatus;
        sort_order: number;
        created_at: string;
      }>;
      staff_members: TableDefinition<{
        user_id: string;
        role: "owner" | "staff";
        is_active: boolean;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      inventory_movements: TableDefinition<{
        id: string;
        variant_id: string;
        movement_type: InventoryMovementType;
        on_hand_delta: number;
        reserved_delta: number;
        reason: string;
        actor_user_id: string | null;
        created_at: string;
      }>;
      site_content: TableDefinition<{
        content_key: string;
        eyebrow: string;
        title: string;
        body: string;
        cta_label: string;
        cta_href: string;
        status: ProductStatus;
        updated_at: string;
      }>;
      admin_audit_logs: TableDefinition<{
        id: number;
        actor_user_id: string | null;
        resource_type: AdminResourceType;
        record_id: string;
        action: "insert" | "update";
        changed_fields: string[];
        created_at: string;
      }>;
      customer_profiles: TableDefinition<{
        user_id: string;
        full_name: string;
        phone: string;
        created_at: string;
        updated_at: string;
      }>;
      cart_items: TableDefinition<{
        user_id: string;
        variant_id: string;
        quantity: number;
        updated_at: string;
      }>;
      orders: TableDefinition<{
        id: string;
        reference: string;
        customer_id: string | null;
        customer_name: string;
        customer_email: string;
        customer_phone: string;
        delivery_address: string;
        delivery_city: string;
        delivery_postal_code: string;
        delivery_note: string;
        currency: "LKR";
        subtotal_minor: number;
        delivery_fee_minor: number | null;
        total_minor: number | null;
        status: OrderStatus;
        payment_status: PaymentStatus;
        channel: "whatsapp";
        created_at: string;
        updated_at: string;
      }>;
      order_items: TableDefinition<{
        id: string;
        order_id: string;
        variant_id: string;
        product_title: string;
        sku: string;
        variant_label: string;
        unit_price_minor: number;
        quantity: number;
        line_total_minor: number;
        created_at: string;
      }>;
      stock_reservations: TableDefinition<{
        id: string;
        order_id: string;
        variant_id: string;
        quantity: number;
        status: "reserved" | "released" | "consumed";
        created_at: string;
        updated_at: string;
      }>;
      order_events: TableDefinition<{
        id: number;
        order_id: string;
        actor_user_id: string | null;
        event_type: "created" | "status_changed" | "delivery_fee_set";
        from_status: OrderStatus | null;
        to_status: OrderStatus | null;
        reason: string;
        created_at: string;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      has_admin_role: {
        Args: { p_roles?: string[] };
        Returns: boolean;
      };
      publish_product: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
      archive_product: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
      archive_product_media: {
        Args: { p_media_id: string; p_product_id: string };
        Returns: undefined;
      };
      set_product_collections: {
        Args: { p_product_id: string; p_collection_ids: string[] };
        Returns: undefined;
      };
      adjust_inventory: {
        Args: { p_variant_id: string; p_quantity_delta: number; p_reason: string };
        Returns: { stock_on_hand: number; reserved_quantity: number; available_quantity: number }[];
      };
      manage_staff_member: {
        Args: { p_user_id: string; p_role: "owner" | "staff"; p_is_active: boolean };
        Returns: undefined;
      };
      set_homepage_content: {
        Args: {
          p_eyebrow: string;
          p_title: string;
          p_body: string;
          p_cta_label: string;
          p_cta_href: string;
          p_status: ProductStatus;
        };
        Returns: undefined;
      };
      quote_cart: {
        Args: { p_items: Json };
        Returns: Json;
      };
      replace_customer_cart: {
        Args: { p_items: Json };
        Returns: Json;
      };
      create_order_with_quote: {
        Args: {
          p_confirmed_quote_hash: string;
          p_confirmed_subtotal_minor: number;
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_delivery_address: string;
          p_delivery_city: string;
          p_delivery_note: string;
          p_delivery_postal_code: string;
          p_guest_access_hash?: string | null;
          p_idempotency_key: string;
          p_items: Json;
        };
        Returns: Json;
      };
      transition_order: {
        Args: { p_order_id: string; p_next_status: string; p_reason: string };
        Returns: string;
      };
      set_order_delivery_fee: {
        Args: { p_order_id: string; p_delivery_fee_minor: number; p_reason: string };
        Returns: undefined;
      };
      get_guest_order: {
        Args: { p_reference: string; p_access_hash: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
