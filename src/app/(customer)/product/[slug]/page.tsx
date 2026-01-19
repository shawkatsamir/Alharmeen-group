import { notFound } from "next/navigation";
import {
  getProductBySlug,
  getAllProductSlugs,
} from "@/services/server/products";
import ProductClient from "./_components/ProductClient";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

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
