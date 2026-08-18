import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "اتصل بنا",
  description:
    "تواصل مع الحرمين جروب — العنوان، أرقام الهاتف، الواتساب، البريد الإلكتروني وساعات العمل.",
  alternates: { canonical: "https://alharmaingroup.com/contact" },
};

export const revalidate = 3600;

/*
 * Every detail here already appears in the site footer — nothing is invented.
 */
const CHANNELS = [
  {
    icon: Phone,
    label: "الهاتف",
    value: "01031722719",
    href: "tel:01031722719",
    ltr: true,
  },
  {
    icon: MessageCircle,
    label: "واتساب",
    value: "تواصل معنا على واتساب",
    href: "https://wa.me/201031722719",
    ltr: false,
  },
  {
    icon: Mail,
    label: "البريد الإلكتروني",
    value: "support@alharmaingroup.com",
    href: "mailto:support@alharmaingroup.com",
    ltr: true,
  },
];

export default function ContactPage() {
  return (
    <div className="bg-surface">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <h1 className="border-r-4 border-primary pr-4 text-2xl font-bold sm:text-3xl">
          اتصل بنا
        </h1>
        <p className="mt-3 pr-4 text-muted-foreground">
          فريقنا جاهز للرد على استفساراتك عن المنتجات والأسعار والتوصيل.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CHANNELS.map(({ icon: Icon, label, value, href, ltr }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="rounded-xl border border-border bg-surface-raised p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">{label}</p>
              <p
                dir={ltr ? "ltr" : undefined}
                className={`mt-1 text-sm break-words text-muted-foreground ${
                  ltr ? "text-right" : ""
                }`}
              >
                {value}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <MapPin className="mb-3 h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">العنوان</p>
            <p className="mt-1 text-sm text-muted-foreground">
              شارع الكنيسة، طريق الإبراهيمية، ديرب نجم، محافظة الشرقية
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <Clock className="mb-3 h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">ساعات العمل</p>
            <p className="mt-1 text-sm text-muted-foreground">
              السبت - الخميس: 9:00 ص - 10:00 م
            </p>
            <p className="text-sm text-muted-foreground">
              الجمعة: 2:00 م - 10:00 م
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
