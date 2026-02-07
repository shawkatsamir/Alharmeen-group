import { createStaticClient } from "@/lib/supabase/server";
import Image from "next/image";
import { Product } from "@/features/products/types";
import { Button } from "@/shared/components/ui/Button";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ products?: string }>;
}

export default async function ComparePage({ searchParams }: Props) {
  // 1. Get IDs from URL (e.g., "id1,id2,id3")
  const { products: productIdsString } = await searchParams;
  const productIds = productIdsString?.split(",") || [];

  if (productIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-lg text-gray-500">لم يتم اختيار منتجات للمقارنة</p>
        <Button asChild>
          <Link href="/">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  // 2. Fetch ONLY these products from DB
  const supabase = await createStaticClient();
  const { data } = await supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .in("id", productIds);

  const products = (data || []) as Product[];

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-lg text-gray-500">المنتجات غير موجودة</p>
        <Button asChild>
          <Link href="/">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-6">مقارنة المنتجات</h1>

      <table className="w-full border-collapse min-w-[800px] bg-white rounded-lg overflow-hidden shadow-sm">
        <thead>
          <tr>
            <th className="p-4 bg-gray-50 text-start w-40 border-b">
              المواصفات
            </th>
            {products.map((p) => (
              <th key={p.id} className="p-4 w-60 border-l border-b bg-gray-50">
                <div className="relative h-40 w-full mx-auto mb-4 bg-white rounded-md p-2">
                  <Image
                    src={p.images?.[0]?.image_url || "/placeholder.svg"}
                    alt={p.name_ar}
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold line-clamp-2 min-h-12">
                  {p.name_ar}
                </h3>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-gray-50/50">
            <td className="p-4 font-bold bg-gray-50">السعر</td>
            {products.map((p) => (
              <td
                key={p.id}
                className="p-4 text-center border-l text-primary font-bold text-lg"
              >
                {p.price.toLocaleString()} ج.م
              </td>
            ))}
          </tr>
          {/* Add more comparison rows here */}
          <tr className="border-b hover:bg-gray-50/50">
            <td className="p-4 font-bold bg-gray-50">الماركة</td>
            {products.map((p) => (
              <td key={p.id} className="p-4 text-center border-l">
                {p.brand?.name_ar || "-"}
              </td>
            ))}
          </tr>
          <tr className="border-b hover:bg-gray-50/50">
            <td className="p-4 font-bold bg-gray-50">الحالة</td>
            {products.map((p) => (
              <td key={p.id} className="p-4 text-center border-l">
                {p.stock_quantity !== undefined && p.stock_quantity > 0 ? (
                  <span className="text-green-600 font-medium">متوفر</span>
                ) : (
                  <span className="text-red-500 font-medium">غير متوفر</span>
                )}
              </td>
            ))}
          </tr>
          <tr className="border-b hover:bg-gray-50/50">
            <td className="p-4 font-bold bg-gray-50">خيارات</td>
            {products.map((p) => (
              <td key={p.id} className="p-4 text-center border-l">
                <Button asChild size="sm" className="w-full">
                  <Link href={`/product/${p.slug}`}>عرض التفاصيل</Link>
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
