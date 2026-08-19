import Link from "next/link";
import { getNavigationCategories } from "@/services/server/categories";
import { ChevronDown } from "lucide-react";
import { CartButton } from "@/features/cart/components/CartButton";
import { UserMenu } from "@/shared/components/layout/UserMenu";
import { HeaderSearch } from "@/features/search/components/HeaderSearch";
import { WishlistHeaderButton } from "@/features/wishlist/components/WishlistHeaderButton";

export default async function Header() {
  // `cache()`d in the service — the customer layout calls this too.
  const categories = await getNavigationCategories();

  return (
    // Sticky at every breakpoint. It used to be `lg:sticky` only, so mobile
    // users lost the search and cart as soon as they scrolled.
    <header className="sticky top-0 z-50 border-b border-border bg-surface-raised/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-3 py-3 lg:py-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground"
            >
              ح
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-primary">
                الحرمين جروب
              </span>
              <span className="block text-[11px] text-muted-foreground">
                للأجهزة الكهربائية
              </span>
            </span>
          </Link>

          <div className="hidden max-w-2xl flex-1 lg:flex">
            <HeaderSearch />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <HeaderSearch isMobileToggle />
            {/* Cart and wishlist now reachable from the mobile header too. */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:inline-flex">
                <WishlistHeaderButton />
              </span>
              <span className="hidden lg:inline-flex">
                <UserMenu />
              </span>
              <CartButton />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden border-t border-border lg:block">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-center gap-8 py-3">
            {categories.map((category) => (
              // Named group so nothing nested inside can be triggered by an
              // ancestor's hover state.
              <div
                key={category.id}
                className="group/nav relative flex h-full items-center"
              >
                <Link
                  href={`/${category.slug}`}
                  className="flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
                >
                  {category.name}
                  {category.subcategories.length > 0 && (
                    <ChevronDown className="h-4 w-4 transition-transform group-hover/nav:rotate-180" />
                  )}
                </Link>

                {category.subcategories.length > 0 && (
                  <div className="invisible absolute top-full right-0 w-64 translate-y-2 rounded-b-lg border-t-2 border-primary bg-surface-raised opacity-0 shadow-xl transition-all duration-200 ease-out group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100">
                    <ul className="py-2">
                      {category.subcategories.map((sub) => (
                        <li key={sub.slug}>
                          <Link
                            href={`/${category.slug}/${sub.slug}`}
                            className="block px-4 py-2.5 text-sm text-muted-foreground transition-all hover:bg-primary-soft hover:pr-6 hover:text-primary"
                          >
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
