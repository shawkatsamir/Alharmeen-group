export default function WeeklyReport() {
  const metrics = [
    { label: "العملاء", value: "52k" },
    { label: "إجمالي المنتجات", value: "3.5k" },
    { label: "منتجات بالمخزن", value: "2.5k" },
    { label: "نفذت الكمية", value: "0.5k" },
    { label: "الإيرادات", value: "250k" },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-4 lg:p-6 mb-4 lg:mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 lg:mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          تقرير هذا الأسبوع
        </h2>
        <div className="flex items-center gap-2">
          <button className="min-h-11 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground">
            هذا الأسبوع
          </button>
          <button className="min-h-11 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary">
            الأسبوع الماضي
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-surface-sunken rounded-lg p-3 text-center lg:bg-transparent lg:p-0">
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
