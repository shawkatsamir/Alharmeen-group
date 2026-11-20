"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Menu, Heart, User, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlist } from "@/features/wishlist/context/wishlist-context";
import { CountBadge } from "@/shared/components/ui/CountBadge";

export type NavigationCategory = {
  id: string;
  name: string;
  slug: string;
  subcategories: {
    id: string;
    name: string;
    slug: string;
  }[];
};

interface MobileBottomNavProps {
  categories?: NavigationCategory[];
}

import { ChevronDown, X } from "lucide-react";

export function MobileBottomNav({ categories = [] }: MobileBottomNavProps) {
  const pathname = usePathname();
  const itemCount = useCartStore((state) => state.itemCount());
  const { wishlistIds } = useWishlist();
  const wishlistCount = wishlistIds.size;

  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    // Only close if it's open, but do NOT depend on isMenuOpen for triggering this effect
    // We only want to close when pathname changes.
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  type NavItem = {
    label: string;
    href: string;
    icon: React.ElementType;
    onClick?: (e: React.MouseEvent) => void;
    badge?: number | null;
    customClass?: string;
  };

  const navItems: NavItem[] = [
    {
      label: "الرئيسية",
      href: "/",
      icon: Home,
    },
    {
      label: "الأقسام",
      href: "#",
      icon: Menu,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setIsMenuOpen(!isMenuOpen);
      },
    },
    {
      label: "المفضلة",
      href: "/wishlist",
      icon: Heart,
      badge: wishlistCount > 0 ? wishlistCount : null,
      customClass: mounted && wishlistCount > 0 ? "fill-sale text-sale" : "",
    },
    {
      label: "حسابي",
      href: "/account",
      icon: User,
    },
    {
      label: "السلة",
      href: "/cart",
      icon: ShoppingCart,
      badge: itemCount > 0 ? itemCount : null,
    },
  ];

  return (
    <>
      {/* Categories Overlay */}
      {isMenuOpen && (
        /*
         * Starts below the sticky header (z-50), which used to cover this
         * sheet's own title row and close button.
         */
        <div className="fixed inset-x-0 top-(--header-h) bottom-0 z-40 bg-surface-raised lg:hidden flex flex-col pb-20 overflow-hidden motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:duration-300">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold">الأقسام</h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              aria-label="إغلاق الأقسام"
              className="p-2 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {categories.map((category) => {
                const isExpanded = expandedCategories.includes(category.id);
                return (
                  <div key={category.id} className="border-b border-border last:border-0">
                    <div className="flex items-center">
                      <Link
                        href={`/${category.slug}`}
                        className="flex-1 p-4 text-base font-medium text-foreground transition-colors hover:text-primary active:bg-primary-soft"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {category.name}
                      </Link>

                      {category.subcategories.length > 0 && (
                        <button
                          onClick={() => toggleCategory(category.id)}
                          aria-label={`الأقسام الفرعية: ${category.name}`}
                          aria-expanded={isExpanded}
                          className="p-4 border-r border-border bg-surface-sunken/60 text-muted-foreground transition-colors hover:text-primary active:bg-primary-soft"
                        >
                          <ChevronDown
                            className={cn(
                              "w-5 h-5 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>
                      )}
                    </div>

                    {/* Subcategories */}
                    {isExpanded && category.subcategories.length > 0 && (
                      <div className="bg-surface-sunken border-t border-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200">
                        {category.subcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/${category.slug}/${sub.slug}`}
                            className="block px-8 py-3 text-sm text-muted-foreground transition-colors hover:text-primary hover:bg-primary-soft border-b border-border last:border-0 pr-8"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-raised/95 backdrop-blur pb-safe lg:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            // While the categories sheet is open it is the only active tab;
            // otherwise the page's own tab would light up alongside it.
            const isActive = isMenuOpen
              ? item.label === "الأقسام"
              : pathname === item.href;

            const className = cn(
              "group/tab relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            );

            const content = (
              <>
                {/* Active-tab indicator: a pill that grows in at the top edge. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-transform duration-300",
                    isActive ? "scale-x-100" : "scale-x-0",
                  )}
                />
                <span className="relative transition-transform duration-150 motion-safe:group-active/tab:scale-90">
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-colors",
                      item.customClass || "",
                    )}
                  />
                  {mounted && item.badge ? (
                    <CountBadge count={item.badge} />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[11px]",
                    isActive ? "font-bold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </>
            );

            return item.href === "#" ? (
              <button
                key={item.label}
                onClick={item.onClick}
                aria-expanded={isMenuOpen}
                className={className}
              >
                {content}
              </button>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                onClick={item.onClick}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
