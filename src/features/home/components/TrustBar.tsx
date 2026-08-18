import { BadgeCheck, Banknote, Headset, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  {
    icon: BadgeCheck,
    title: "وكيل معتمد",
    body: "منتجات أصلية 100%",
  },
  {
    icon: ShieldCheck,
    title: "ضمان الوكيل",
    body: "ضمان رسمي على كل جهاز",
  },
  {
    icon: Banknote,
    title: "الدفع عند الاستلام",
    body: "ادفع بعد ما تستلم",
  },
  {
    icon: Truck,
    title: "شحن لكل المحافظات",
    body: "توصيل لكل أنحاء مصر",
  },
  {
    icon: Headset,
    title: "دعم فني",
    body: "فريق خدمة عملاء جاهز",
  },
];

/**
 * The highest-value homepage addition for a verified dealer, and the only one
 * that needs no imagery — so it renders identically whether or not category and
 * brand art has been uploaded.
 */
export function TrustBar() {
  return (
    <section className="border-y border-border bg-surface-raised">
      <div className="container mx-auto px-4">
        <ul className="no-scrollbar flex gap-4 overflow-x-auto py-5 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible">
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex min-w-52 shrink-0 items-center gap-3 lg:min-w-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <Icon className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">{title}</p>
                <p className="truncate text-xs text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
