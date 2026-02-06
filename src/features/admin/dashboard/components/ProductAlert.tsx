import { AlertTriangle } from "lucide-react";
import { getLowStockProducts } from "../actions";
import Link from "next/link";

export async function ProductAlert() {
  const lowStockProducts = await getLowStockProducts();

  if (!lowStockProducts || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-6 border border-red-100 dark:border-red-900/30">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
          تنبيهات المخزون
        </h2>
      </div>

      <div className="space-y-3">
        {lowStockProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between bg-background p-3 rounded-md border border-red-100 dark:border-red-900/30 shadow-sm"
          >
            <span className="text-foreground font-medium">
              {product.name_ar}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">المتبقي:</span>
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                {product.stock_quantity}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Link href="/admin/products" className="block mt-4">
        <button className="w-full text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 bg-background border border-red-200 dark:border-red-900/30 py-2 rounded-lg transition-colors">
          عرض كل المنتجات
        </button>
      </Link>
    </div>
  );
}
