"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/Button";
import { Check, Share2 } from "lucide-react";

/**
 * Replaces the two decorative Heart/Share buttons the detail page used to
 * render with no `onClick` at all.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;

    // Native share sheet where available (all mobile browsers we target).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // User dismissed the sheet — not an error worth surfacing.
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Anything else falls through to the clipboard path below.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("تم نسخ رابط المنتج");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleShare}
      aria-label="مشاركة المنتج"
      className="rounded-full shadow-sm"
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Share2 className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
