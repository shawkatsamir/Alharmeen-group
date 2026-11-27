"use client";

import { Menu, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu";
import { Img } from "@/shared/components/ui/Image";
import { NotificationBell } from "../notifications/components/NotificationBell";
import { adminPageTitle } from "./nav-items";
import { ModeToggle } from "./ThemeToggle";
import { AdminSignOutItem } from "./AdminSignOutItem";

/**
 * The admin top bar.
 *
 * Changes from the desktop-only version: the drawer trigger lives here rather
 * than floating over the page content, and the page title is always visible —
 * it was `hidden lg:block`, so a phone had no indication of which screen it
 * was on, with the drawer closed and no breadcrumb either.
 *
 * The 256px-wide search input is gone. It had no `onChange`, no submit handler
 * and an English placeholder: it searched nothing on any viewport, and on a
 * phone it was the single widest element in the header. Each table carries its
 * own working `DebouncedSearchInput`.
 */
export function Header({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();

  return (
    <header className="bg-surface-raised border-border sticky top-0 z-30 border-b">
      <div className="flex h-16 items-center gap-2 px-3 lg:px-6">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="فتح القائمة"
          className="text-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 -ms-1 flex size-11 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <h1 className="text-foreground min-w-0 flex-1 truncate text-base font-bold lg:text-lg">
          {adminPageTitle(pathname)}
        </h1>

        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="حساب المسؤول"
              className="hover:ring-primary/30 focus-visible:ring-ring/50 flex size-11 items-center justify-center rounded-full transition-shadow hover:ring-2 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <span className="bg-surface-sunken size-8 overflow-hidden rounded-full">
                <Img
                  src="/avatar.jpeg"
                  alt=""
                  width={32}
                  height={32}
                  className="size-full object-cover"
                />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem asChild>
                <Link href="/" className="cursor-pointer gap-2">
                  <Store className="size-4" />
                  العودة إلى المتجر
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AdminSignOutItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
