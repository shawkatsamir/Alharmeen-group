import { AlertTriangle } from "lucide-react";
import { getLowStockProducts } from "../actions";
import Link from "next/link";

export async function ProductAlert() {
  const lowStockProducts = await getLowStockProducts();

  if (!lowStockProducts || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-destructive/5 rounded-xl p-4 lg:p-6 border border-destructive/20">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="size-6 text-destructive" />
        <h2 className="text-lg font-semibold text-destructive">
          تنبيهات المخزون
        </h2>
      </div>

      <div className="space-y-3">
        {lowStockProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-3 bg-card p-3 rounded-md border border-destructive/20"
          >
            <span className="text-foreground font-medium">
              {product.name_ar}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">المتبقي:</span>
              <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded-full text-xs font-bold tabular-nums">
                {product.stock_quantity}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Link href="/admin/products" className="block mt-4">
        <button className="w-full min-h-11 text-sm text-destructive font-medium hover:bg-destructive/10 bg-card border border-destructive/20 rounded-lg transition-colors">
          عرض كل المنتجات
        </button>
      </Link>
    </div>
  );
}
