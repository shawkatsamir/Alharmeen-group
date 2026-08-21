import { createStaticClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { Img } from "@/shared/components/ui/Image";
import { Check, XCircle } from "lucide-react";
import RemoveCompareButton from "@/features/products/components/RemoveCompareButton";
import { formatCurrency } from "@/lib/utils";

const getCachedProduct = unstable_cache(
  async (id: string) => {
    const supabase = await createStaticClient();

    const { data: product, error } = await supabase
      .from("products")
      .select(
        "id, name, name_ar, price, old_price, stock_quantity, description, sale_end_date, is_new, slug, images:product_images(image_url)",
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error(
        `Error fetching comparison product ${id}:`,
        JSON.stringify(error, null, 2),
      );
      return null;
    }
    return product;
  },
  ["compare-product-data"], // We will append the ID dynamically? No, unstable_cache arguments are part of the key.
  // Actually, for dynamic keys based on arguments, we need to be careful.
  // unstable_cache(fn, keyParts, options)
  // The documentation says: "keyParts: An array of strings that globally identifies the cached value."
  // If we pass `id` as an argument to the function, it is automatically part of the cache key?
  // "The arguments passed to the cached function are also used to generate the cache key."
  // So `["compare-product-data"]` is a static prefix, and `id` makes it unique. PERFECT.
  {
    revalidate: 3600,
    tags: ["products"],
  },
);

interface Props {
  searchParams: { products?: string };
}

export default async function ComparePage({ searchParams }: Props) {
  const rawIds = (await searchParams).products?.split(",") || [];

  const productIds = rawIds.slice(0, 4);

  if (productIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold">لا توجد منتجات للمقارنة</h1>
        <p className="text-gray-500">
          قم بإضافة منتجات للمقارنة من صفحة المنتجات.
        </p>
      </div>
    );
  }

  // 🚀 3. Fetch Data (Item-Level Caching)
  // Fetch each product individually so they are cached properly
  const productsData = await Promise.all(
    productIds.map((id) => getCachedProduct(id)),
  );

  // Filter out any nulls (failed fetches)
  const products = productsData.filter((p) => p !== null);

  return (
    <div className="container py-10 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-6">
        مقارنة المنتجات ({products.length})
      </h1>

      <div className="min-w-[800px] border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="p-4 bg-gray-50 text-start w-40 border-b">
                المواصفات
              </th>
              {products.map((p) => (
                <th
                  key={p.id}
                  className="p-4 w-60 border-l border-b align-top relative group"
                >
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <RemoveCompareButton productId={p.id} />
                  </div>

                  <div className="relative h-40 w-full mb-4 mx-auto">
                    <Img
                      src={
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (p as any).images?.[0]?.image_url || "/placeholder.svg"
                      }
                      alt={p.name_ar}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-center line-clamp-2 min-h-14">
                    {p.name}
                  </h3>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y">
            {/* Price Row */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="p-4 font-bold bg-gray-50/80 text-gray-700">
                السعر
              </td>
              {products.map((p) => (
                <td
                  key={p.id}
                  className="p-4 text-center border-l text-green-600 font-bold text-xl dir-rtl"
                >
                  {formatCurrency(p.price)}
                </td>
              ))}
            </tr>

            {/* Stock Row */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="p-4 font-bold bg-gray-50/80 text-gray-700">
                التوفر
              </td>
              {products.map((p) => (
                <td key={p.id} className="p-4 text-center border-l">
                  {p.stock_quantity > 0 ? (
                    <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                      <Check className="w-4 h-4" /> متوفر
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-3 py-1 rounded-full text-sm font-medium">
                      <XCircle className="w-4 h-4" /> نفذت الكمية
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Description Row */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="p-4 font-bold bg-gray-50/80 text-gray-700 align-top">
                الوصف
              </td>
              {products.map((p) => (
                <td
                  key={p.id}
                  className="p-4 border-l text-sm text-gray-600 leading-relaxed align-top"
                >
                  <p className="line-clamp-4 hover:line-clamp-none transition-all">
                    {p.description}
                  </p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
