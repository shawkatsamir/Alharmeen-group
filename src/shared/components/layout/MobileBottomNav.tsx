"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Menu, Heart, User, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlist } from "@/features/wishlist/context/wishlist-context";

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

import { ChevronDown, ChevronUp, X } from "lucide-react";

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
    if (isMenuOpen) {
      // Defer to avoid render cycle warning
      setTimeout(() => setIsMenuOpen(false), 0);
    }
  }, [pathname, isMenuOpen]);

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
      customClass: wishlistCount > 0 ? "fill-red-500 text-red-500" : "",
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
        <div className="fixed inset-0 z-40 bg-white lg:hidden flex flex-col pb-20 overflow-hidden animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">الأقسام</h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {categories.map((category) => {
                const isExpanded = expandedCategories.includes(category.id);
                return (
                  <div key={category.id} className="border-b last:border-0">
                    <div className="flex items-center">
                      <Link
                        href={`/${category.slug}`}
                        className="flex-1 p-4 text-base font-medium text-gray-800 hover:text-primary active:bg-gray-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {category.name}
                      </Link>

                      {category.subcategories.length > 0 && (
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="p-4 border-r border-gray-100 text-gray-500 hover:text-primary active:bg-gray-50 bg-gray-50/50"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Subcategories */}
                    {isExpanded && category.subcategories.length > 0 && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        {category.subcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/${category.slug}/${sub.slug}`}
                            className="block px-8 py-3 text-sm text-gray-600 hover:text-primary hover:bg-gray-100 border-b border-gray-100 last:border-0 pr-8"
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe lg:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.label === "الأقسام" && isMenuOpen);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1",
                  isActive
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-6 h-6", item.customClass || "")} />
                  {mounted && item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
