import { Facebook, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { NavigationCategory } from "@/services/server/categories";

interface FooterProps {
  categories?: NavigationCategory[];
}

/*
 * Only routes that exist are linked. This list previously also carried
 * /faq, /shipping, /returns, /terms and /privacy — none of which are
 * implemented, so all five 404'd. They need real policy copy from the business
 * before they can be linked again.
 */
const QUICK_LINKS = [
  { href: "/about-us", label: "من نحن" },
  { href: "/contact", label: "اتصل بنا" },
  { href: "/offers", label: "العروض" },
  { href: "/best-sellers", label: "الأكثر مبيعاً" },
];

export default function Footer({ categories = [] }: FooterProps) {
  const displayedCategories = categories.slice(0, 7);

  return (
    <footer className="mt-16 bg-foreground text-background/75">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-4 text-lg font-bold text-background">
              الحرمين للأجهزة الكهربائية والمنزلية
            </p>
            <p className="mb-4 text-sm leading-relaxed">
              شريكك الموثوق للأجهزة الكهربائية والمنزلية. وكيل معتمد لأفضل شركات
              الأجهزة الكهربائية والمنزلية.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/share/17zDjvxrcJ/"
                aria-label="فيسبوك"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-accent hover:text-accent-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-background">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-background">الأقسام</h3>
            <ul className="space-y-2 text-sm">
              {displayedCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/${category.slug}`}
                    className="transition-colors hover:text-accent"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-background">
              معلومات التواصل
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <MapPin className="h-5 w-5 shrink-0 text-accent" />
                <span>شارع الكنيسة طريق الابراهيمية، ديرب نجم، الشرقية</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="flex flex-col gap-1">
                  <a
                    href="tel:01031722719"
                    dir="ltr"
                    className="font-medium transition-colors hover:text-accent"
                  >
                    01031722719
                  </a>
                  <a
                    href="https://wa.me/201031722719"
                    className="text-xs text-success transition-colors hover:text-accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    تواصل عبر واتساب
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <Mail className="h-5 w-5 shrink-0 text-accent" />
                <a
                  href="mailto:support@alharmaingroup.com"
                  className="transition-colors hover:text-accent"
                >
                  support@alharmaingroup.com
                </a>
              </li>
            </ul>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="mb-2 text-sm text-background/60">ساعات العمل:</p>
              <p className="text-sm">السبت - الخميس: 9:00 ص - 10:00 م</p>
              <p className="text-sm">الجمعة: 2:00 م - 10:00 م</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-background/60">
          <p>© {new Date().getFullYear()} الحرمين جروب. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
