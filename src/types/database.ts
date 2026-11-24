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
  | "collection_media"
  | "site_content"
  | "staff_member"
  | "store_settings"
  | "offer"
  | "order";
type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "processing"
  | "packed"
  | "dispatched"
  | "delivered"
  | "delivery_failed"
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
        delivery_fee_minor: number | null;
        cod_enabled: boolean;
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
        colour_name: string | null;
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
      collection_media: TableDefinition<{
        id: string;
        collection_id: string;
        storage_path: string;
        alt_text: string;
        status: ProductStatus;
        sort_order: number;
        created_at: string;
      }>;
      store_settings: TableDefinition<{
        singleton: boolean;
        cod_enabled: boolean;
        whatsapp_number: string | null;
        updated_at: string;
      }>;
      offers: TableDefinition<{
        id: string;
        name: string;
        target_type: "product" | "collection";
        target_product_id: string | null;
        target_collection_id: string | null;
        minimum_sets: number;
        discount_basis_points: number;
        starts_at: string | null;
        ends_at: string | null;
        is_enabled: boolean;
        created_at: string;
        updated_at: string;
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
        order_id: string | null;
        order_item_id: string | null;
        return_inspection_id: string | null;
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
        discount_minor: number;
        total_minor: number | null;
        status: OrderStatus;
        payment_status: PaymentStatus;
        payment_method: "manual" | "cod";
        offer_id: string | null;
        offer_name_snapshot: string | null;
        offer_discount_basis_points: number | null;
        quote_hash: string | null;
        payment_refunded_at: string | null;
        payment_refund_note: string | null;
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
        set_count_snapshot: number;
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
      return_inspections: TableDefinition<{
        id: string;
        order_item_id: string;
        idempotency_key: string;
        sellable_quantity: number;
        damaged_quantity: number;
        missing_quantity: number;
        reason: string;
        actor_user_id: string | null;
        created_at: string;
      }>;
      order_events: TableDefinition<{
        id: number;
        order_id: string;
        actor_user_id: string | null;
        event_type:
          | "created"
          | "status_changed"
          | "delivery_fee_set"
          | "payment_recorded"
          | "payment_refunded"
          | "delivery_failed"
          | "return_inspected";
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
      publish_product_media: {
        Args: { p_media_id: string; p_product_id: string };
        Returns: undefined;
      };
      publish_collection: {
        Args: { p_collection_id: string };
        Returns: undefined;
      };
      archive_collection_media: {
        Args: { p_media_id: string; p_collection_id: string };
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
          p_payment_method?: "manual" | "cod";
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
      save_commerce_settings: {
        Args: { p_whatsapp_number: string | null; p_cod_enabled: boolean };
        Returns: undefined;
      };
      save_offer: {
        Args: {
          p_offer_id: string | null;
          p_name: string;
          p_target_type: "product" | "collection";
          p_target_id: string;
          p_minimum_sets: number;
          p_discount_basis_points: number;
          p_starts_at: string | null;
          p_ends_at: string | null;
          p_is_enabled: boolean;
        };
        Returns: string;
      };
      get_active_storefront_offers: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          name: string;
          target_type: string;
          target_name: string;
          target_slug: string;
          minimum_sets: number;
          discount_basis_points: number;
          ends_at: string | null;
        }[];
      };
      mark_order_delivery_failed: {
        Args: { p_order_id: string; p_reason: string };
        Returns: undefined;
      };
      record_order_payment: {
        Args: { p_order_id: string; p_amount_minor: number; p_reference: string };
        Returns: undefined;
      };
      record_order_refund: {
        Args: { p_order_id: string; p_amount_minor: number; p_note: string };
        Returns: undefined;
      };
      record_return_inspection: {
        Args: {
          p_order_item_id: string;
          p_idempotency_key: string;
          p_sellable_quantity: number;
          p_damaged_quantity: number;
          p_missing_quantity: number;
          p_reason: string;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
