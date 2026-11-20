import { cn } from "@/lib/utils";

interface CountBadgeProps {
  count: number;
  className?: string;
}

/**
 * The item count on the cart, wishlist and bottom-nav icons. One style for all
 * three — they had drifted to three different reds, sizes and offsets.
 *
 * Amber, not red: `sale` means urgency, never a count (see globals.css). Keyed on
 * the count so each change remounts it and replays the bump — the visible
 * answer to "did that add to my cart?".
 */
export function CountBadge({ count, className }: CountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      key={count}
      className={cn(
        "pointer-events-none absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[11px] leading-none font-bold text-accent-foreground ring-2 ring-surface-raised tabular-nums motion-safe:animate-badge-bump",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
