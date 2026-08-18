"use client";

import { useCompareStore } from "@/stores/compareStore";
import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function CompareBar() {
  const { ids, clear } = useCompareStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || ids.length === 0) return null;

  // Create the shareable URL
  const compareUrl = `/compare?products=${ids.join(",")}`;

  return (
    // `bottom-safe-nav` clears the h-16 MobileBottomNav (both are z-50, so the
    // pill used to sit on top of it); `lg:bottom-6` drops back down where the
    // bottom nav is hidden.
    <div className="fixed bottom-safe-nav left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface-raised px-5 py-3 shadow-xl animate-in slide-in-from-bottom-5 lg:bottom-6">
      <span className="text-sm font-medium whitespace-nowrap">
        تم اختيار {ids.length}{" "}
        {ids.length === 1 ? "منتج" : ids.length === 2 ? "منتجين" : "منتجات"}
      </span>

      <Button asChild size="sm" variant="default">
        <Link href={compareUrl}>قارن الآن</Link>
      </Button>

      <button
        onClick={clear}
        aria-label="إلغاء المقارنة"
        className="text-muted-foreground transition-colors hover:text-sale"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
