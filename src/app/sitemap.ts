import { MetadataRoute } from "next";
import { getAllProductSlugs } from "@/services/server/products";
import { getSubCategory } from "@/services/server/categories";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://alharmaingroup.com";

  // Static routes
  const routes = [""].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "daily" as const,
    priority: 1,
  }));

  // Products
  const productSlugs = await getAllProductSlugs();
  const productRoutes = productSlugs.map((slug) => ({
    url: `${baseUrl}/product/${slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Categories / Subcategories
  const subcategories = await getSubCategory();
  const categoryRoutes = subcategories.map((item) => ({
    url: `${baseUrl}/${item.category}/${item.subcategory}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...routes, ...productRoutes, ...categoryRoutes];
}
