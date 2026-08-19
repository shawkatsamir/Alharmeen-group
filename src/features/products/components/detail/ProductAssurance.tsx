import { BadgeCheck, Banknote, ShieldCheck, Truck } from "lucide-react";

interface ProductAssuranceProps {
  warrantyInfo: string | null;
  brandName?: string | null;
}

/**
 * `warranty_info` is populated on 67 of 75 products and was previously rendered
 * nowhere. For an authorized dealer it is a top-tier conversion signal, so it
 * gets a real card alongside the standing service promises.
 */
export function ProductAssurance({
  warrantyInfo,
  brandName,
}: ProductAssuranceProps) {
  const promises = [
    {
      icon: BadgeCheck,
      title: "وكيل معتمد",
      body: brandName
        ? `منتج ${brandName} أصلي بضمان الوكيل`
        : "منتجات أصلية 100% بضمان الوكيل",
    },
    {
      icon: Truck,
      title: "شحن لكل المحافظات",
      body: "توصيل سريع إلى جميع أنحاء الجمهورية",
    },
    {
      icon: Banknote,
      title: "الدفع عند الاستلام",
      body: "ادفع نقداً عند استلام طلبك",
    },
  ];

  return (
    <div className="space-y-5">
      {warrantyInfo && (
        <div className="flex gap-4 rounded-xl border-r-4 border-success bg-success-soft p-4">
          <ShieldCheck className="h-6 w-6 shrink-0 text-success" />
          <div>
            <p className="font-bold text-foreground">تفاصيل الضمان</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {warrantyInfo}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {promises.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-surface-sunken p-4"
          >
            <Icon className="mb-2 h-5 w-5 text-primary" />
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
