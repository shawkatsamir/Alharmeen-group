"use client";

import { useState } from "react";
import Link from "next/link";

import { Header } from "@/features/admin/components/Header";
import { AdminNav } from "@/features/admin/components/AdminNav";
import {
  AdminLogoutButton,
  Sidebar,
} from "@/features/admin/components/Sidebar";
import { ThemeProvider } from "@/features/admin/components/ThemeProvider";
import { BrandWordmark } from "@/shared/components/brand/BrandWordmark";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/Sheet";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * Two separate pieces of state. They used to be one `sidebarOpen` boolean
   * that meant "expanded" on desktop and "drawer showing" on phone, and it
   * defaulted to `true` — so every phone load opened with a 256px drawer
   * covering the screen, with no backdrop to tap and no Escape to press.
   */
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/*
       * The phone lets the document scroll: a `h-screen` shell with an inner
       * scroller fights the address bar, breaks scroll-to-top and strands
       * `position: sticky`. The fixed-height two-pane shell starts at `lg`.
       */}
      <div
        dir="rtl"
        className="admin-touch bg-surface text-foreground min-h-dvh lg:flex lg:h-dvh lg:overflow-hidden"
      >
        <aside
          className={`hidden shrink-0 transition-[width] duration-300 lg:block ${
            collapsed ? "lg:w-20" : "lg:w-64"
          }`}
        >
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </aside>

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="start" className="lg:hidden" showClose={false}>
            <SheetHeader className="pe-4">
              <SheetTitle className="sr-only">قائمة لوحة التحكم</SheetTitle>
              <SheetClose asChild>
                <Link
                  href="/admin"
                  aria-label="الحرمين — لوحة التحكم"
                  className="focus-visible:ring-ring/50 w-fit rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <BrandWordmark className="h-8" />
                </Link>
              </SheetClose>
            </SheetHeader>
            <SheetBody>
              {/*
               * Every destination closes the drawer on the way out. Radix
               * `Close` does it on click, which beats a pathname effect —
               * that would trip `react-hooks/set-state-in-effect`.
               */}
              <AdminNav
                variant="full"
                linkWrapper={(node) => <SheetClose asChild>{node}</SheetClose>}
              />
            </SheetBody>
            <SheetFooter>
              <AdminLogoutButton />
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col lg:h-dvh lg:overflow-hidden">
          <Header onOpenNav={() => setNavOpen(true)} />
          <main className="min-w-0 flex-1 px-3 py-4 pb-safe sm:px-4 lg:overflow-y-auto lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
