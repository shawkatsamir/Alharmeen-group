import Link from "next/link";
import { getNavigationCategories } from "@/services/server/categories";
import { ChevronDown } from "lucide-react";
import { CartButton } from "@/features/cart/components/CartButton";
import { UserMenu } from "@/shared/components/layout/UserMenu";
import { HeaderSearch } from "@/features/search/components/HeaderSearch";

export default async function Header() {
  const categories = await getNavigationCategories();

  return (
    <header className="bg-white shadow-sm relative z-50 sticky top-0">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div>
              <div className="text-primary font-bold text-lg">الحرمين</div>
              <div className="text-xs text-gray-500">للأجهزة الكهربائية</div>
            </div>
          </Link>

          {/* Desktop Search */}
          <div className="hidden lg:flex flex-1 max-w-2xl">
            <HeaderSearch />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Toggle - handled by HeaderSearch */}
            <HeaderSearch isMobileToggle />
            <UserMenu />
            <CartButton />
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="hidden lg:block border-t">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-center gap-8 py-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="group relative h-full flex items-center"
              >
                <Link
                  href={`/${category.slug}`}
                  className="flex items-center gap-1 text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  {category.name}
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </Link>

                {/* Desktop Dropdown */}
                <div className="absolute top-full right-0 w-64 bg-white shadow-xl border-t-2 border-blue-600 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 ease-in-out">
                  <ul className="py-2">
                    {category.subcategories.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/${category.slug}/${sub.slug}`}
                          className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:pr-6 transition-all"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
