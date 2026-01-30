import { Database } from "@/shared/types/database.types";

export type Product = Database["public"]["Tables"]["products"]["Row"] & {
  category?: { slug: string };
  brand?: { name_ar: string };
  images?: { image_url: string }[];
  sale_end_date?: string | null;
};
