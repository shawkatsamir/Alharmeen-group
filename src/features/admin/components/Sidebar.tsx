"use client";

import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "@/shared/components/brand/BrandWordmark";
import { AdminNav } from "./AdminNav";

/**
 * The desktop sidebar: expanded, or collapsed to an icon rail.
 *
 * It used to double as the phone drawer off a single `open` boolean, so
 * "collapsed on desktop" and "drawer dismissed on phone" were the same state —
 * which is why the drawer opened over the content on every phone load. The
 * phone drawer is now a `Sheet` in the layout and this component is `lg`-only.
 */
export function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="bg-surface-raised border-border flex h-full flex-col border-s">
      <div
        className={cn(
          "border-border flex h-16 shrink-0 items-center gap-2 border-b px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <Link
            href="/admin"
            aria-label="الحرمين — لوحة التحكم"
            className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <BrandWordmark className="h-8" />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
          className="text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          {collapsed ? (
            <ChevronLeft className="size-5" />
          ) : (
            <ChevronRight className="size-5" />
          )}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <AdminNav variant={collapsed ? "rail" : "full"} />
      </div>

      <div className="border-border shrink-0 border-t p-3">
        <AdminLogoutButton collapsed={collapsed} />
      </div>
    </div>
  );
}

export function AdminLogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={signOut}
      title={collapsed ? "تسجيل الخروج" : undefined}
      className={cn(
        "text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
        collapsed && "justify-center px-0",
      )}
    >
      <LogOut className="size-5 shrink-0" aria-hidden />
      {collapsed ? (
        <span className="sr-only">تسجيل الخروج</span>
      ) : (
        <span>تسجيل الخروج</span>
      )}
    </button>
  );
}
