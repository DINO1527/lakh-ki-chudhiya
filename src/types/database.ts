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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
