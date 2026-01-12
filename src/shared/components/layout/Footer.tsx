import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                م ك
              </div>
              <div>
                <div className="text-white">متجر الأجهزة الكهربائية</div>
              </div>
            </div>
            <p className="text-sm mb-4">
              شريكك الموثوق للأجهزة المنزلية والمطبخ. منتجات عالية الجودة من
              أفضل العلامات التجارية بأسعار تنافسية.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  من نحن
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  اتصل بنا
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  الأسئلة الشائعة
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  الشحن والتوصيل
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  المرتجعات والاسترداد
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  الشروط والأحكام
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  سياسة الخصوصية
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div>
            <h3 className="text-white mb-4">الفئات</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  أجهزة المطبخ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  أجهزة منزلية
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  المنزل الذكي
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  الترفيه
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  العناية الشخصية
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  الإضاءة
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  العروض الخاصة
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <h3 className="text-white mb-4">معلومات التواصل</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                <span>123 شارع الرئيسي، القاهرة، مصر</span>
              </li>
              <li className="flex gap-2">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <div>+20 123 456 7890</div>
                  <div>+20 123 456 7891</div>
                </div>
              </li>
              <li className="flex gap-2">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <span>info@electricstore.com</span>
              </li>
            </ul>
            <div className="mt-4">
              <p className="text-sm mb-2">ساعات العمل:</p>
              <p className="text-sm">السبت - الخميس: 9:00 ص - 9:00 م</p>
              <p className="text-sm">الجمعة: 2:00 م - 9:00 م</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
