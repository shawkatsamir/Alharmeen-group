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
  className?: string;
  children: ReactNode;
}

/**
 * The standard homepage/listing block: heading with the accent rule, optional
 * subtitle and "see more" link, consistent vertical rhythm.
 *
 * Replaces the header markup that was copy-pasted across ProductSlider and the
 * offers / best-sellers / featured pages.
 */
export function Section({
  title,
  subtitle,
  seeMoreLink,
  seeMoreLabel = "عرض الكل",
  tone = "plain",
  className,
  children,
}: SectionProps) {
  return (
    <section
      className={cn(
        "py-8 md:py-10",
        tone === "raised" && "bg-surface-raised",
        className,
      )}
    >
      <div className="container mx-auto px-4">
        {(title || seeMoreLink) && (
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              {title && (
                <h2 className="border-r-4 border-primary pr-3 text-xl font-bold text-foreground sm:text-2xl">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-2 pr-3 text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            {seeMoreLink && (
              <Link
                href={seeMoreLink}
                className="group/more inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
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
