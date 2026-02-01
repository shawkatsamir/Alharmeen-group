"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Menu, Heart, User, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

export function MobileBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((state) => state.itemCount());

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const navItems = [
    {
      label: "الرئيسية",
      href: "/",
      icon: Home,
    },
    {
      label: "الأقسام",
      href: "/categories", // Or trigger menu
      icon: Menu,
    },
    {
      label: "المفضلة",
      href: "/wishlist",
      icon: Heart,
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe lg:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive ? "text-primary" : "text-gray-500 hover:text-gray-900",
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
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
  );
}
