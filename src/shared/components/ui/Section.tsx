import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title?: string;
  subtitle?: string;
  seeMoreLink?: string;
  seeMoreLabel?: string;
  /** Surface treatment. `plain` inherits the page background. */
  tone?: "plain" | "raised";
  /** Anchor target, e.g. the hero's "تصفح الأقسام" button. */
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * The standard homepage/listing block: heading with the accent bar, optional
 * subtitle and "see more" link, consistent vertical rhythm.
 *
 * Replaces the header markup that was copy-pasted across ProductSlider and the
 * offers / best-sellers / featured pages.
 *
 * The whole block fades up once as it scrolls into view (`reveal`, see
 * motion.css). This is the only place `reveal` is applied — nesting it inside
 * would fade content twice, and items in a horizontal rail cannot use it.
 */
export function Section({
  title,
  subtitle,
  seeMoreLink,
  seeMoreLabel = "عرض الكل",
  tone = "plain",
  id,
  className,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-(--header-h) py-10 md:py-12",
        tone === "raised" && "bg-surface-raised",
        className,
      )}
    >
      <div className="reveal container mx-auto px-4">
        {(title || seeMoreLink) && (
          <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
            <div>
              {title && (
                <h2 className="flex items-center gap-3 text-xl font-bold text-foreground sm:text-2xl">
                  {/* A soft rounded bar instead of a hard 4px border rule. */}
                  <span
                    aria-hidden="true"
                    className="h-6 w-1.5 shrink-0 rounded-full bg-linear-to-b from-primary to-accent"
                  />
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-2 ps-[1.125rem] text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            {seeMoreLink && (
              <Link
                href={seeMoreLink}
                className="group/more inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary-soft hover:text-primary-hover"
              >
                {seeMoreLabel}
                <ChevronLeft className="h-4 w-4 transition-transform group-hover/more:-translate-x-0.5" />
              </Link>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
