import { MoreVertical } from "lucide-react";

export default function WeeklyReport() {
  const metrics = [
    { label: "العملاء", value: "52k" },
    { label: "إجمالي المنتجات", value: "3.5k" },
    { label: "منتجات بالمخزن", value: "2.5k" },
    { label: "نفذت الكمية", value: "0.5k" },
    { label: "الإيرادات", value: "250k" },
  ];

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border border-border mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          تقرير هذا الأسبوع
        </h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-xs font-medium text-primary-foreground bg-primary rounded">
            هذا الأسبوع
          </button>
          <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded">
            الأسبوع الماضي
          </button>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center">
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
