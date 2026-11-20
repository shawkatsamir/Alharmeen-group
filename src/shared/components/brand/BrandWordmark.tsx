import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  WORDMARK_GROUP,
  WORDMARK_LETTERS,
  WORDMARK_RULES,
  WORDMARK_VIEWBOX,
} from "./wordmark-paths";

interface BrandWordmarkProps {
  /**
   * `brand` — navy name, deep gold جروب, for light surfaces (follows `.dark`
   * to white in the admin). `inverse` — white name, gold جروب, for the navy
   * hero and the footer.
   */
  tone?: "brand" | "inverse";
  /** Entrance choreography; see motion.css. Nothing moves under reduced motion. */
  intro?: "none" | "subtle" | "full";
  /** Adds the light sweep: after the intro, and on hover of the enclosing link. */
  shine?: boolean;
  /** Size it with a height class; the width follows the viewBox. */
  className?: string;
}

/**
 * The الحرمين lockup as inline SVG. Decorative — the enclosing link or heading
 * carries the accessible name.
 *
 * No `"use client"`: it renders in server components (header, footer, hero)
 * and in the client admin sidebar alike. `useId` is available to both.
 */
export function BrandWordmark({
  tone = "brand",
  intro = "none",
  shine = false,
  className,
}: BrandWordmarkProps) {
  const id = useId();
  const clipId = `${id}-letters`;
  const gradientId = `${id}-shine`;
  const { width, height } = WORDMARK_VIEWBOX;

  const letterFill =
    tone === "inverse" ? "fill-white" : "fill-brand-navy dark:fill-white";
  const goldFill =
    tone === "inverse"
      ? "fill-brand-gold"
      : "fill-brand-gold-deep dark:fill-brand-gold";
  // A white glint reads on navy letters; on white letters it needs warmth.
  const glint =
    tone === "inverse" ? "var(--brand-gold-light)" : "oklch(1 0 0)";

  /*
   * The sweep band is parked past the right edge of the letters, far enough
   * that its skew cannot reach back over them. motion.css moves it leftwards.
   */
  const band = { x: width + 60, y: -10, width: 90, height: height + 20 };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      // Intrinsic size, so `h-* w-auto` derives the width from the ratio.
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
      data-intro={intro}
      className={cn("wm h-10 w-auto shrink-0", className)}
    >
      {shine && (
        <defs>
          <clipPath id={clipId}>
            <path d={WORDMARK_LETTERS} />
          </clipPath>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={glint} stopOpacity="0" />
            <stop offset="0.5" stopColor={glint} stopOpacity="0.6" />
            <stop offset="1" stopColor={glint} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}

      <path className={cn("wm-letters", letterFill)} d={WORDMARK_LETTERS} />

      {shine && (
        <g clipPath={`url(#${clipId})`}>
          <rect className="wm-shine" fill={`url(#${gradientId})`} {...band} />
          <rect
            className="wm-shine-hover"
            fill={`url(#${gradientId})`}
            {...band}
          />
        </g>
      )}

      <path className={cn("wm-group", goldFill)} d={WORDMARK_GROUP} />
      {WORDMARK_RULES.map((rule, i) => (
        <rect
          key={i}
          className={cn("wm-rule", i === 0 ? "wm-rule-l" : "wm-rule-r", goldFill)}
          {...rule}
        />
      ))}
    </svg>
  );
}
