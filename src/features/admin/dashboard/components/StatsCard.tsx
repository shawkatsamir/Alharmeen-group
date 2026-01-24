import { TrendingUp, TrendingDown, MoreVertical } from "lucide-react";

export function StatsCards() {
  const stats = [
    {
      title: "إجمالي المبيعات",
      subtitle: "آخر 7 أيام",
      value: "$350K",
      change: "+10.4k",
      trend: "up",
      label: "مبيعات",
      prevValue: "السابقة 7 أيام ($235)",
    },
    {
      title: "إجمالي الطلبات",
      subtitle: "آخر 7 أيام",
      value: "2.5K",
      change: "+14.4k",
      trend: "up",
      label: "طلب",
      prevValue: "السابقة 7 أيام (7.6K)",
    },
    {
      title: "قيد الانتظار وملغى",
      subtitle: "آخر 7 أيام",
      pending: "509",
      pendingLabel: "طلب 204",
      canceled: "94",
      canceledLabel: "% -10.4k",
      hasSplit: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {stat.title}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stat.subtitle}
              </p>
            </div>
            <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {stat.hasSplit ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.pending}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.pendingLabel}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.canceled}
                  </span>
                  <span className="text-sm text-red-500">
                    {stat.canceledLabel}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline space-x-3 mb-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </span>
                <div
                  className={`flex items-center space-x-1 text-sm ${
                    stat.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{stat.label}</span>
                  <span className="font-medium">{stat.change}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {stat.prevValue}
              </p>
            </>
          )}

          <button className="mt-4 text-sm text-[#4EA674] font-medium hover:text-[#3d8a5e] border border-[#4EA674] rounded-full px-4 py-1">
            التفاصيل
          </button>
        </div>
      ))}
    </div>
  );
}
