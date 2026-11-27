"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  ADMIN_NAV,
  isAdminNavActive,
  type AdminNavItem,
} from "./nav-items";
import { ADMIN_NAV_ICONS } from "./nav-icons";

interface AdminNavProps {
  /**
   * `rail` is the 5rem desktop strip: icons only, label as a native tooltip.
   * `full` is the expanded desktop sidebar and the phone drawer.
   */
  variant: "full" | "rail";
  /** Wraps each link so following it also closes the phone drawer. */
  linkWrapper?: (node: React.ReactNode, item: AdminNavItem) => React.ReactNode;
}

export function AdminNav({ variant, linkWrapper }: AdminNavProps) {
  const pathname = usePathname();
  const isRail = variant === "rail";

  return (
    <div className={cn("space-y-6 p-3", isRail && "px-2")}>
      {ADMIN_NAV.map((section) => (
        <div key={section.title}>
          {isRail ? (
            <div
              aria-hidden
              className="bg-border mx-auto mb-3 h-px w-6 first:hidden"
            />
          ) : (
            <h3 className="text-muted-foreground mb-2 px-3 text-xs font-semibold">
              {section.title}
            </h3>
          )}
          <nav aria-label={section.title} className="space-y-1">
            {section.items.map((item) => {
              const Icon = ADMIN_NAV_ICONS[item.icon];
              const isActive = isAdminNavActive(item.href, pathname);

              /*
               * Not a link: there is no route behind it. Rendering it as one
               * would make the drawer navigate to a 404, which on a phone is
               * a dead end with no sidebar left to recover from.
               */
              if (!item.ready) {
                return (
                  <div
                    key={item.href}
                    title={isRail ? `${item.label} — قريباً` : undefined}
                    className={cn(
                      "text-muted-foreground/55 flex min-h-11 items-center gap-3 rounded-md px-3 text-sm",
                      isRail && "justify-center px-0",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {!isRail && (
                      <>
                        <span className="truncate">{item.label}</span>
                        <span className="bg-surface-sunken text-muted-foreground ms-auto rounded-full px-2 py-0.5 text-[0.6875rem]">
                          قريباً
                        </span>
                      </>
                    )}
                  </div>
                );
              }

              const link = (
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={isRail ? item.label : undefined}
                  className={cn(
                    "focus-visible:ring-ring/50 flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-primary-soft hover:text-primary",
                    isRail && "justify-center px-0",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {!isRail && <span className="truncate">{item.label}</span>}
                  {isRail && <span className="sr-only">{item.label}</span>}
                </Link>
              );

              return (
                <div key={item.href}>
                  {linkWrapper ? linkWrapper(link, item) : link}
                </div>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}
