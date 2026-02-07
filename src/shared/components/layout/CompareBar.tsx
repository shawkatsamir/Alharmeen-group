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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white shadow-xl border rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <span className="font-medium text-sm">تم اختيار {ids.length} منتجات</span>

      <Button asChild size="sm" variant="default">
        <Link href={compareUrl}>قارن الآن</Link>
      </Button>

      <button onClick={clear} className="text-gray-400 hover:text-red-500">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
