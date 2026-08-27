export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      brands: {
        Row: {
          created_at: string;
          description_ar: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          name: string;
          name_ar: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_ar?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name: string;
          name_ar: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_ar?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name?: string;
          name_ar?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          description_ar: string | null;
          delivery_tier: string | null;
          display_order: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name_ar: string;
          name_en: string;
          parent_id: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_ar?: string | null;
          delivery_tier?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name_ar: string;
          name_en: string;
          parent_id?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_ar?: string | null;
          delivery_tier?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name_ar?: string;
          name_en?: string;
          parent_id?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_tiers: {
        Row: {
          base_fee: number;
          display_order: number;
          key: string;
          label_ar: string;
          max_fee: number;
          min_fee: number;
          per_km_rate: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          base_fee?: number;
          display_order?: number;
          key: string;
          label_ar: string;
          max_fee: number;
          min_fee?: number;
          per_km_rate?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          base_fee?: number;
          display_order?: number;
          key?: string;
          label_ar?: string;
          max_fee?: number;
          min_fee?: number;
          per_km_rate?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_tiers_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      free_shipping_rules: {
        Row: {
          id: number;
          max_distance_km: number;
          min_order_total: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          max_distance_km: number;
          min_order_total: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          max_distance_km?: number;
          min_order_total?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "free_shipping_rules_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      governorates: {
        Row: {
          display_order: number;
          id: number;
          is_deliverable: boolean;
          name_ar: string;
          shipping_cost: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          display_order?: number;
          id?: number;
          is_deliverable?: boolean;
          name_ar: string;
          shipping_cost?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          display_order?: number;
          id?: number;
          is_deliverable?: boolean;
          name_ar?: string;
          shipping_cost?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "governorates_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      localities: {
        Row: {
          coordinates_verified: boolean;
          distance_km_override: number | null;
          governorate_id: number;
          id: number;
          is_deliverable: boolean;
          lat: number | null;
          lng: number | null;
          name_ar: string;
          straight_km: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          coordinates_verified?: boolean;
          distance_km_override?: number | null;
          governorate_id: number;
          id?: number;
          is_deliverable?: boolean;
          lat?: number | null;
          lng?: number | null;
          name_ar: string;
          straight_km?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          coordinates_verified?: boolean;
          distance_km_override?: number | null;
          governorate_id?: number;
          id?: number;
          is_deliverable?: boolean;
          lat?: number | null;
          lng?: number | null;
          name_ar?: string;
          straight_km?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "localities_governorate_id_fkey";
            columns: ["governorate_id"];
            isOneToOne: false;
            referencedRelation: "governorates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "localities_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      locality_aliases: {
        Row: {
          alias: string;
          id: number;
          locality_id: number;
        };
        Insert: {
          alias: string;
          id?: number;
          locality_id: number;
        };
        Update: {
          alias?: string;
          id?: number;
          locality_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "locality_aliases_locality_id_fkey";
            columns: ["locality_id"];
            isOneToOne: false;
            referencedRelation: "localities";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          order_id: string | null;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          order_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          order_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          brand_name: string | null;
          created_at: string;
          id: string;
          order_id: string;
          product_id: string | null;
          product_image: string | null;
          product_name: string;
          product_sku: string | null;
          quantity: number;
          total_price: number;
          unit_price: number;
          variant_options: Json | null;
        };
        Insert: {
          brand_name?: string | null;
          created_at?: string;
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_image?: string | null;
          product_name: string;
          product_sku?: string | null;
          quantity: number;
          total_price: number;
          unit_price: number;
          variant_options?: Json | null;
        };
        Update: {
          brand_name?: string | null;
          created_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_image?: string | null;
          product_name?: string;
          product_sku?: string | null;
          quantity?: number;
          total_price?: number;
          unit_price?: number;
          variant_options?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: string;
          notes: string | null;
          order_id: string;
          recorded_by: string | null;
          reference: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method: string;
          notes?: string | null;
          order_id: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: string;
          notes?: string | null;
          order_id?: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_payments_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          order_id: string;
          status: string;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id: string;
          status: string;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          admin_notes: string | null;
          amount_paid: number;
          created_at: string;
          customer_email: string;
          customer_name: string;
          customer_notes: string | null;
          customer_phone: string;
          delivered_at: string | null;
          delivery_tier: string | null;
          discount_amount: number;
          id: string;
          order_number: string;
          payment_method: string;
          payment_status: string;
          shipping_address_line: string;
          shipping_city: string;
          shipping_cost: number;
          shipping_distance_km: number | null;
          shipping_governorate: string;
          shipping_locality_id: number | null;
          status: string;
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_token: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          amount_paid?: number;
          created_at?: string;
          customer_email: string;
          customer_name: string;
          customer_notes?: string | null;
          customer_phone: string;
          delivered_at?: string | null;
          delivery_tier?: string | null;
          discount_amount?: number;
          id?: string;
          order_number?: string;
          payment_method?: string;
          payment_status?: string;
          shipping_address_line: string;
          shipping_city: string;
          shipping_cost?: number;
          shipping_governorate: string;
          status?: string;
          subtotal: number;
          total: number;
          tracking_number?: string | null;
          tracking_token?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          amount_paid?: number;
          created_at?: string;
          customer_email?: string;
          customer_name?: string;
          customer_notes?: string | null;
          customer_phone?: string;
          delivered_at?: string | null;
          delivery_tier?: string | null;
          discount_amount?: number;
          id?: string;
          order_number?: string;
          payment_method?: string;
          payment_status?: string;
          shipping_address_line?: string;
          shipping_city?: string;
          shipping_cost?: number;
          shipping_distance_km?: number | null;
          shipping_governorate?: string;
          shipping_locality_id?: number | null;
          status?: string;
          subtotal?: number;
          total?: number;
          tracking_number?: string | null;
          tracking_token?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      product_groups: {
        Row: {
          axes: string[];
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string | null;
          updated_at: string;
        };
        Insert: {
          axes?: string[];
          created_at?: string;
          id?: string;
          name_ar: string;
          name_en?: string | null;
          updated_at?: string;
        };
        Update: {
          axes?: string[];
          created_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          alt_text_ar: string | null;
          alt_text_en: string | null;
          created_at: string;
          display_order: number;
          id: string;
          image_url: string;
          is_primary: boolean;
          product_id: string;
          storage_path: string | null;
        };
        Insert: {
          alt_text_ar?: string | null;
          alt_text_en?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url: string;
          is_primary?: boolean;
          product_id: string;
          storage_path?: string | null;
        };
        Update: {
          alt_text_ar?: string | null;
          alt_text_en?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url?: string;
          is_primary?: boolean;
          product_id?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand_id: string;
          buying_price: number | null;
          category_id: string;
          content_blocks: Json | null;
          created_at: string;
          delivery_tier: string | null;
          description_ar: string | null;
          description_en: string | null;
          features: string[] | null;
          fts: unknown;
          group_id: string | null;
          id: string;
          is_active: boolean;
          is_available: boolean;
          is_best_seller: boolean;
          is_featured: boolean;
          is_group_primary: boolean;
          is_new: boolean;
          is_special_offer: boolean;
          low_stock_threshold: number;
          meta_description_ar: string | null;
          meta_title_ar: string | null;
          name_ar: string;
          name_en: string | null;
          old_price: number | null;
          price: number;
          sale_end_date: string | null;
          sales_count: number;
          sku: string;
          slug: string;
          specifications: Json | null;
          stock_quantity: number;
          updated_at: string;
          variant_values: Json | null;
          video_urls: Json | null;
          view_count: number;
          warranty_info: string | null;
        };
        Insert: {
          brand_id: string;
          buying_price?: number | null;
          category_id: string;
          content_blocks?: Json | null;
          created_at?: string;
          delivery_tier?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          features?: string[] | null;
          fts?: unknown;
          group_id?: string | null;
          id?: string;
          is_active?: boolean;
          is_available?: boolean;
          is_best_seller?: boolean;
          is_featured?: boolean;
          is_group_primary?: boolean;
          is_new?: boolean;
          is_special_offer?: boolean;
          low_stock_threshold?: number;
          meta_description_ar?: string | null;
          meta_title_ar?: string | null;
          name_ar: string;
          name_en?: string | null;
          old_price?: number | null;
          price: number;
          sale_end_date?: string | null;
          sales_count?: number;
          sku: string;
          slug: string;
          specifications?: Json | null;
          stock_quantity?: number;
          updated_at?: string;
          variant_values?: Json | null;
          video_urls?: Json | null;
          view_count?: number;
          warranty_info?: string | null;
        };
        Update: {
          brand_id?: string;
          buying_price?: number | null;
          category_id?: string;
          content_blocks?: Json | null;
          created_at?: string;
          delivery_tier?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          features?: string[] | null;
          fts?: unknown;
          group_id?: string | null;
          id?: string;
          is_active?: boolean;
          is_available?: boolean;
          is_best_seller?: boolean;
          is_featured?: boolean;
          is_group_primary?: boolean;
          is_new?: boolean;
          is_special_offer?: boolean;
          low_stock_threshold?: number;
          meta_description_ar?: string | null;
          meta_title_ar?: string | null;
          name_ar?: string;
          name_en?: string | null;
          old_price?: number | null;
          price?: number;
          sale_end_date?: string | null;
          sales_count?: number;
          sku?: string;
          slug?: string;
          specifications?: Json | null;
          stock_quantity?: number;
          updated_at?: string;
          variant_values?: Json | null;
          video_urls?: Json | null;
          view_count?: number;
          warranty_info?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "product_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          address: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      derive_payment_status: {
        Args: { p_has_refund: boolean; p_paid: number; p_total: number };
        Returns: string;
      };
      find_locality: {
        Args: { p_governorate: string; p_name: string };
        Returns: number;
      };
      governorate_order_stats: {
        Args: never;
        Returns: {
          governorate: string;
          order_count: number;
          revenue: number;
        }[];
      };
      haversine_km: {
        Args: {
          p_lat1: number;
          p_lat2: number;
          p_lng1: number;
          p_lng2: number;
        };
        Returns: number;
      };
      is_admin: { Args: never; Returns: boolean };
      normalize_color_name: { Args: { p_name: string }; Returns: string };
      normalize_governorate_name: { Args: { p_name: string }; Returns: string };
      normalize_place_name: { Args: { p_name: string }; Returns: string };
      recompute_locality_distances: { Args: never; Returns: number };
      search_products: {
        Args: { limit_count?: number; search_term: string };
        Returns: {
          brand_id: string;
          buying_price: number | null;
          category_id: string;
          content_blocks: Json | null;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          features: string[] | null;
          fts: unknown;
          group_id: string | null;
          id: string;
          is_active: boolean;
          is_available: boolean;
          is_best_seller: boolean;
          is_featured: boolean;
          is_group_primary: boolean;
          is_new: boolean;
          is_special_offer: boolean;
          low_stock_threshold: number;
          meta_description_ar: string | null;
          meta_title_ar: string | null;
          name_ar: string;
          name_en: string | null;
          old_price: number | null;
          price: number;
          sale_end_date: string | null;
          sales_count: number;
          sku: string;
          slug: string;
          specifications: Json | null;
          stock_quantity: number;
          updated_at: string;
          variant_values: Json | null;
          video_urls: Json | null;
          view_count: number;
          warranty_info: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "products";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
