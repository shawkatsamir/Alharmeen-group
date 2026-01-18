import { notFound } from "next/navigation";
import { getProductBySlug } from "@/services/server/products";
import ProductClient from "./_components/ProductClient";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductClient product={product} />;
}
