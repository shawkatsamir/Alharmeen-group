import { BadgeCheck, Banknote, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductAssuranceProps {
  warrantyInfo: string | null;
  brandName?: string | null;
}

/**
 * `warranty_info` is populated on 67 of 75 products and was previously rendered
 * nowhere. For an authorized dealer it is a top-tier conversion signal, so it
 * leads the section, above the standing service promises.
 *
 * Rows, not boxes: this already sits inside a `ProductSection` panel, and the
 * old tinted warranty card and three promise cards nested cards in a card.
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
    <div className="space-y-6">
      {warrantyInfo && (
        <div className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <ShieldCheck className="size-6" />
          </span>
          <div className="pt-0.5">
            <p className="font-bold text-foreground">تفاصيل الضمان</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {warrantyInfo}
            </p>
          </div>
        </div>
      )}

      <ul
        className={cn(
          "grid gap-5 sm:grid-cols-3 sm:gap-6",
          warrantyInfo && "border-t border-border pt-6",
        )}
      >
        {promises.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
