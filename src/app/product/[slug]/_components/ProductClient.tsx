"use client";

import { useEffect } from "react";
import { ProductDetail } from "@/features/products/components/ProductDetail";
import { Database } from "@/shared/types/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  brand?: Database["public"]["Tables"]["brands"]["Row"];
  category?: Database["public"]["Tables"]["categories"]["Row"];
  images?: Database["public"]["Tables"]["product_images"]["Row"][];
};

interface ProductClientProps {
  product: Product;
}

export default function ProductClient({ product }: ProductClientProps) {
  useEffect(() => {
    console.log("Product Data:", product);
  }, [product]);

  return <ProductDetail product={product} />;
}
