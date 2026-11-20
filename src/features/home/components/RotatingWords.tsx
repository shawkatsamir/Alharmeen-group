"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";

interface RotatingWordsProps {
  words: string[];
  /** Milliseconds each word stays on screen. */
  interval?: number;
  className?: string;
}

/**
 * Cycles through whole words — never letters, which would break Arabic joining.
 *
 * Decorative: render it inside an `aria-hidden` wrapper next to a `sr-only`
 * sentence that lists every word, so a screen reader hears the full list once
 * instead of a word changing under it every few seconds.
 *
 * The word sits at the inline end of its line, so a change in its width never
 * moves the text before it. Static under reduced motion.
 */
export function RotatingWords({
  words,
  interval = 2400,
  className,
}: RotatingWordsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const count = words.length;

  useEffect(() => {
    if (reducedMotion || count < 2) return;
    const id = setInterval(
      () => setIndex((current) => (current + 1) % count),
      interval,
    );
    return () => clearInterval(id);
  }, [count, interval, reducedMotion]);

  if (count === 0) return null;

  return (
    <span className="inline-block overflow-hidden align-bottom">
      {/* Remounted per word so the entrance replays. */}
      <span
        key={index}
        className={cn("inline-block motion-safe:animate-word-in", className)}
      >
        {words[index % count]}
      </span>
    </span>
  );
}
