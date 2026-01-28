"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export function useNotifications() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Fetch Data
  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10); // Only get latest 10
      return data || [];
    },
  });

  // 2. Real-time Listener ⚡
  // This makes the bell ring instantly when a user buys something
  useEffect(() => {
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          // Add new notification to the top of the list immediately
          queryClient.setQueryData(["admin-notifications"], (old: any[]) => [
            payload.new,
            ...old,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  // 3. Mark as Read Function
  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, markAsRead };
}
