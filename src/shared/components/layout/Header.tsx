import Link from "next/link";
import { getNavigationCategories } from "@/services/server/categories";
import { ChevronDown } from "lucide-react";
import { CartButton } from "@/features/cart/components/CartButton";
import { UserMenu } from "@/shared/components/layout/UserMenu";
import { HeaderSearch } from "@/features/search/components/HeaderSearch";
import { WishlistHeaderButton } from "@/features/wishlist/components/WishlistHeaderButton";
import { BrandWordmark } from "@/shared/components/brand/BrandWordmark";

export default async function Header() {
  // `cache()`d in the service — the customer layout calls this too.
  const categories = await getNavigationCategories();

  return (
    // Sticky at every breakpoint. It used to be `lg:sticky` only, so mobile
    // users lost the search and cart as soon as they scrolled.
    <header className="header-scroll-shadow sticky top-0 z-50 border-b border-border bg-surface-raised/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-3 py-3 lg:py-4">
          {/*
           * The lockup stays 40px tall, the height the old letter badge had,
           * because `--header-h` in globals.css is derived from it. The header
           * lives in the layout, so the intro plays on a full load only — not
           * on every client-side navigation.
           */}
          <Link
            href="/"
            aria-label="الحرمين جروب — الرئيسية"
            className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <BrandWordmark intro="subtle" shine className="h-10" />
            <span
              aria-hidden="true"
              className="hidden border-s border-border ps-3 text-xs leading-snug text-muted-foreground sm:block"
            >
              للأجهزة الكهربائية
              <br />
              والمنزلية
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
                {/* The underline grows from the right, in reading order. */}
                <Link
                  href={`/${category.slug}`}
                  className="relative flex items-center gap-1 font-medium text-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-right after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:text-primary group-hover/nav:after:scale-x-100 group-focus-within/nav:after:scale-x-100"
                >
                  {category.name}
                  {category.subcategories.length > 0 && (
                    <ChevronDown className="h-4 w-4 transition-transform group-hover/nav:rotate-180" />
                  )}
                </Link>

                {category.subcategories.length > 0 && (
                  <div className="invisible absolute top-full right-0 w-64 translate-y-2 rounded-lg border border-border bg-surface-raised opacity-0 shadow-xl transition-all duration-200 ease-out group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100">
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
