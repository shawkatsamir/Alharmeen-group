"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/Popover";
import { ScrollArea } from "@/shared/components/ui/ScrollArea";
import { cn } from "@/lib/utils";
import { useNotifications } from "../hooks/useNotifications";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          unreadCount > 0 ? `الإشعارات (${unreadCount} جديد)` : "الإشعارات"
        }
        className="text-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 relative flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="bg-sale border-surface-raised absolute top-2 end-2 size-2.5 rounded-full border-2" />
        )}
      </PopoverTrigger>

      {/*
       * `w-80` alone overflowed a 360px viewport once the popover's own
       * collision padding was added. Capped to the viewport instead.
       */}
      <PopoverContent
        align="end"
        dir="rtl"
        className="w-[min(20rem,calc(100vw-1.5rem))] p-0 shadow-xl"
      >
        <div className="border-border bg-surface-sunken flex items-center justify-between gap-2 border-b p-4">
          <h4 className="font-semibold">الإشعارات</h4>
          {unreadCount > 0 && (
            <span className="bg-sale-soft text-sale rounded-full px-2 py-0.5 text-xs font-medium">
              {unreadCount} جديد
            </span>
          )}
        </div>

        <ScrollArea className="h-[min(20rem,50dvh)]">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center text-sm">
              لا توجد إشعارات بعد.
            </div>
          ) : (
            <div className="divide-border divide-y">
              {notifications.map((n) => (
                <Link
                  href={`/admin/orders?id=${n.order_id}`}
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "hover:bg-primary-soft block p-4 text-start transition-colors",
                    !n.is_read && "bg-primary-soft/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        !n.is_read
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {n.message}
                    </p>
                    {!n.is_read && (
                      <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                    )}
                  </div>
                  <p
                    className="text-muted-foreground mt-1 text-xs"
                    suppressHydrationWarning
                  >
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                      locale: arSA,
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
