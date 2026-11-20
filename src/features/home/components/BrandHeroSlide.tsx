import Link from "next/link";
import { BrandWordmark } from "@/shared/components/brand/BrandWordmark";
import { Button } from "@/shared/components/ui/Button";
import { cn } from "@/lib/utils";
import { SLIDE_ENTER } from "../slide-motion";
import { RotatingWords } from "./RotatingWords";

interface BrandHeroSlideProps {
  /** Brand names to cycle through, in display order. */
  brandNames: string[];
}

/**
 * The hero's first slide: the company, not a promotion. Styled after the
 * existing ALHARMAN logo — navy field, white name, gold detail.
 *
 * It owns the page's <h1>. The visible heading is the dealer claim; the brand
 * name is prepended for assistive tech and crawlers, so the accessible name is
 * the one the old `sr-only` h1 had.
 *
 * Text rather than a photo, so it is also a faster first paint than the image
 * slide it now precedes. Everything here replays each time the carousel comes
 * back to it (see SLIDE_ENTER and the `[data-active]` rule in motion.css).
 */
export function BrandHeroSlide({ brandNames }: BrandHeroSlideProps) {
  const names = brandNames.map((n) => n.trim()).filter(Boolean).slice(0, 6);

  return (
    <div className="relative isolate flex h-full items-center bg-brand-navy text-white">
      {/* Ambient light, drifting slowly. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-1/3 -left-[12%] size-[26rem] rounded-full bg-brand-gold/20 blur-3xl motion-safe:animate-drift sm:size-[34rem]" />
        <div className="absolute -bottom-1/2 left-1/4 size-[28rem] rounded-full bg-primary/45 blur-3xl motion-safe:animate-drift-reverse sm:size-[38rem]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(1_0_0/0.07),transparent_60%)]" />
        {/*
         * The lockup again, faint, filling the empty far half on wide screens.
         * Kept clear of the copy: at full width it read as clutter behind it.
         */}
        <BrandWordmark
          tone="inverse"
          className="absolute top-1/2 left-[5%] hidden h-[48%] -translate-y-1/2 opacity-[0.06] lg:block"
        />
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-xl">
          {/*
           * No kicker above the wordmark: a "وكيل معتمد" pill here repeated the
           * h1 below word for word. The heading carries the claim.
           */}
          <BrandWordmark
            tone="inverse"
            intro="full"
            shine
            className="h-20 sm:h-28 lg:h-32"
          />

          <h1
            className={cn(
              SLIDE_ENTER,
              "mt-6 text-lg leading-snug font-bold [animation-delay:450ms] sm:text-2xl lg:text-3xl",
            )}
          >
            <span className="sr-only">الحرمين جروب — </span>
            وكيل معتمد للأجهزة المنزلية والكهربائية في مصر
          </h1>

          <p
            className={cn(
              SLIDE_ENTER,
              "mt-3 text-sm text-white/80 [animation-delay:650ms] sm:text-lg",
            )}
          >
            {names.length > 0 ? (
              <>
                <span aria-hidden="true">
                  ضمان الوكيل الرسمي على{" "}
                  <RotatingWords
                    words={names}
                    className="font-bold text-brand-gold-light"
                  />
                </span>
                <span className="sr-only">
                  ضمان الوكيل الرسمي على {names.join("، ")}
                </span>
              </>
            ) : (
              "ضمان الوكيل الرسمي على كل جهاز"
            )}
          </p>

          <div
            className={cn(
              SLIDE_ENTER,
              "mt-7 flex flex-wrap gap-3 [animation-delay:800ms]",
            )}
          >
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent-hover"
            >
              <Link href="/offers">تسوق العروض</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/35 bg-transparent text-white hover:border-white/60 hover:bg-white/10 hover:text-white dark:bg-transparent"
            >
              <Link href="#categories">تصفح الأقسام</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
