import { Database } from "@/shared/types/database.types";

export type Product = Database["public"]["Tables"]["products"]["Row"] & {
  category?: { slug: string };
  images?: { image_url: string }[];
};
