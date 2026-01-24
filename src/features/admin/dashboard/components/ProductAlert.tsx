import { AlertTriangle } from "lucide-react";

export function ProductAlert() {
  const lowStockProducts = [
    { name: "لابتوب HP Pavilion", stock: 3 },
    { name: "سماعة Sony", stock: 5 },
    { name: "شاحن Anker", stock: 2 },
  ];

  return (
    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-6 border border-red-100 dark:border-red-900/30">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
          تنبيهات المخزون
        </h2>
      </div>

      <div className="space-y-3">
        {lowStockProducts.map((product, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-background p-3 rounded-md border border-red-100 dark:border-red-900/30 shadow-sm"
          >
            <span className="text-foreground font-medium">{product.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">المتبقي:</span>
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                {product.stock}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 bg-background border border-red-200 dark:border-red-900/30 py-2 rounded-lg transition-colors">
        عرض كل التنبيهات
      </button>
    </div>
  );
}
