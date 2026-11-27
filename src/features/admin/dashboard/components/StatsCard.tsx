import { TrendingDown, TrendingUp } from "lucide-react";

/**
 * NOTE: these figures are placeholders, not live data — see the dashboard
 * note in CLAUDE.md. This pass fixes how they lay out on a phone and leaves
 * the numbers alone.
 */
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-card border-border rounded-xl border p-4 lg:p-6"
        >
          {/*
           * The per-card `MoreVertical` button is gone: it had no handler and
           * no menu, so on a phone it was a 20px target that did nothing in
           * the corner of every card.
           */}
          <div className="mb-3">
            <h3 className="text-muted-foreground text-sm font-medium">
              {stat.title}
            </h3>
            <p className="text-muted-foreground/80 mt-0.5 text-xs">
              {stat.subtitle}
            </p>
          </div>

          {stat.hasSplit ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-3xl font-bold tabular-nums">
                  {stat.pending}
                </span>
                <span className="text-muted-foreground text-sm">
                  {stat.pendingLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-3xl font-bold tabular-nums">
                  {stat.canceled}
                </span>
                <span className="text-destructive text-sm">
                  {stat.canceledLabel}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-foreground text-3xl font-bold tabular-nums">
                  {stat.value}
                </span>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    stat.trend === "up" ? "text-success" : "text-destructive"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  <span>{stat.label}</span>
                  <span className="font-medium tabular-nums">
                    {stat.change}
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground/80 text-xs">
                {stat.prevValue}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
