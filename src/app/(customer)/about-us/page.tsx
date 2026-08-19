import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Banknote, ShieldCheck, Truck } from "lucide-react";
import { getBrands } from "@/services/server/products";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "الحرمين جروب — وكيل معتمد للأجهزة الكهربائية والمنزلية في مصر، بضمان الوكيل الرسمي وشحن لكل المحافظات.",
  alternates: { canonical: "https://alharmaingroup.com/about-us" },
};

export const revalidate = 3600;

const VALUES = [
  {
    icon: BadgeCheck,
    title: "وكيل معتمد",
    body: "كل المنتجات أصلية وموردة من الوكلاء الرسميين في السوق المصري.",
  },
  {
    icon: ShieldCheck,
    title: "ضمان رسمي",
    body: "كل جهاز يأتي بضمان الوكيل المعتمد وخدمة ما بعد البيع.",
  },
  {
    icon: Truck,
    title: "شحن لكل المحافظات",
    body: "نوصل طلبك إلى جميع أنحاء الجمهورية.",
  },
  {
    icon: Banknote,
    title: "الدفع عند الاستلام",
    body: "ادفع نقداً بعد استلام الطلب ومعاينته.",
  },
];

export default async function AboutUsPage() {
  const brands = await getBrands();

  return (
    <div className="bg-surface">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <h1 className="border-r-4 border-primary pr-4 text-2xl font-bold sm:text-3xl">
          من نحن
        </h1>

        <p className="mt-5 leading-relaxed text-muted-foreground">
          الحرمين جروب شريكك الموثوق للأجهزة الكهربائية والمنزلية. نعمل كوكيل
          معتمد لعدد من أكبر العلامات التجارية في السوق المصري، ونوفر تشكيلة
          واسعة من الثلاجات والغسالات والبوتاجازات والميكروويف والمكانس
          الكهربائية وسخانات المياه — كلها أصلية وبضمان الوكيل الرسمي.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-surface-raised p-5"
            >
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        {brands.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold">العلامات التي نوفرها</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {brands.map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={`/brand/${brand.slug}`}
                    className="inline-block rounded-full border border-border bg-surface-raised px-4 py-2 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                  >
                    {brand.name_ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 rounded-xl border border-border bg-surface-raised p-6">
          <p className="font-semibold">عندك سؤال؟</p>
          <p className="mt-1 text-sm text-muted-foreground">
            فريق خدمة العملاء جاهز لمساعدتك في اختيار الجهاز المناسب.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            تواصل معنا
          </Link>
        </div>
      </div>
    </div>
  );
}
