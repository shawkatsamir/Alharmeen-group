import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { NavigationCategory } from "@/services/server/categories";

interface FooterProps {
  categories?: NavigationCategory[];
}

export default function Footer({ categories = [] }: FooterProps) {
  const displayedCategories = categories.slice(0, 7);

  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <div className="text-white font-bold text-lg">
                  الحرمين للأجهزة الكهربائية و المنزلية
                </div>
              </div>
            </div>
            <p className="text-sm mb-4 leading-relaxed">
              شريكك الموثوق للأجهزة الكهربائية و المنزلية. وكيل معتمد لأفضل
              شركات الأجهزة الكهربائية و المنزلية
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/share/17zDjvxrcJ/"
                className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white mb-4 font-semibold">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about-us"
                  className="hover:text-primary transition-colors"
                >
                  من نحن
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-primary transition-colors"
                >
                  اتصل بنا
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-primary transition-colors"
                >
                  الأسئلة الشائعة
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="hover:text-primary transition-colors"
                >
                  الشحن والتوصيل
                </Link>
              </li>
              <li>
                <Link
                  href="/returns"
                  className="hover:text-primary transition-colors"
                >
                  المرتجعات والاسترداد
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  الشروط والأحكام
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  سياسة الخصوصية
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div>
            <h3 className="text-white mb-4 font-semibold">الفئات</h3>
            <ul className="space-y-2 text-sm">
              {displayedCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/${category.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <h3 className="text-white mb-4 font-semibold">معلومات التواصل</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>شارع الكنيسة طريق الابراهيمية، ديرب نجم، الشرقية</span>
              </li>
              <li className="flex gap-2 items-start">
                <Phone className="w-5 h-5 text-primary shrink-0 mt-1" />
                <div className="flex flex-col gap-1">
                  <a
                    href="tel:01031722719"
                    className="hover:text-primary transition-colors dir-ltr font-medium"
                  >
                    01031722719
                  </a>
                  <a
                    href="https://wa.me/201031722719"
                    className="text-xs text-green-500 hover:text-green-400 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    تواصل عبر واتساب
                  </a>
                </div>
              </li>
              <li className="flex gap-2">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <a
                  href="mailto:support@alharmaingroup.com"
                  className="hover:text-primary transition-colors"
                >
                  support@alharmaingroup.com
                </a>
              </li>
            </ul>
            <div className="mt-6 border-t border-gray-800 pt-4">
              <p className="text-sm mb-2 text-gray-400">ساعات العمل:</p>
              <p className="text-sm">السبت - الخميس: 9:00 ص - 10:00 م</p>
              <p className="text-sm">الجمعة: 2:00 م - 10:00 م</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-8 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} الحرمين جروب. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
