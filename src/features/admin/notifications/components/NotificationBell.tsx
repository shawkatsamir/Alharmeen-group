"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/Popover";
import { Button } from "@/shared/components/ui/Button";
import { ScrollArea } from "@/shared/components/ui/ScrollArea";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />

          {/* The Red Dot 🔴 */}
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-white" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-xl">
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
          <h4 className="font-semibold">الاشعارات</h4>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <Link
                  href={`/admin/orders?id=${n.order_id}`} // Link to the order
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "block p-4 hover:bg-gray-50 transition-colors text-left",
                    !n.is_read && "bg-blue-50/50", // Highlight unread
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        !n.is_read
                          ? "font-semibold text-gray-900"
                          : "text-gray-600",
                      )}
                    >
                      {n.message}
                    </p>
                    {!n.is_read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p
                    className="text-xs text-gray-400 mt-1"
                    suppressHydrationWarning
                  >
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
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
