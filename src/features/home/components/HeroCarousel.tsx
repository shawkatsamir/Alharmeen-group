"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Img } from "@/shared/components/ui/Image";
import { Button } from "@/shared/components/ui/Button";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { SLIDE_ENTER } from "../slide-motion";

export interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description?: string;
  cta: string;
  href: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  /**
   * Rendered as the first slide, ahead of the photo slides — the brand intro.
   * It can be a server component; it receives the same `group/slide` and
   * `data-active` hooks as every other slide.
   */
  lead?: ReactNode;
  /** Milliseconds between auto-advances. 0 disables autoplay. */
  interval?: number;
}

const SLIDE_FRAME =
  "group/slide relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden sm:aspect-[16/9] lg:aspect-[21/9]";

export function HeroCarousel({
  slides,
  lead,
  interval = 6000,
}: HeroCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const offset = lead ? 1 : 0;
  const total = slides.length + offset;
  // Moving content that starts on its own must be stoppable (WCAG 2.2.2); for
  // visitors who asked for reduced motion, it simply never starts.
  const autoplay = interval > 0 && total > 1 && !reducedMotion;

  const goTo = useCallback((index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    // RTL scrolling uses negative offsets in most engines; derive the target
    // from the element's own scroll direction rather than assuming a sign.
    const width = el.clientWidth;
    const direction = el.scrollLeft <= 0 ? -1 : 1;
    el.scrollTo({ left: direction * width * index, behavior: "smooth" });
  }, []);

  // Track the visible slide from scroll position so the dots stay honest.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = el.clientWidth;
        if (width > 0) {
          setActive(Math.round(Math.abs(el.scrollLeft) / width));
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!autoplay || paused) return;
    const id = setInterval(() => {
      goTo((active + 1) % total);
    }, interval);
    return () => clearInterval(id);
  }, [active, autoplay, goTo, interval, paused, total]);

  if (total === 0) return null;

  return (
    <section
      className="relative bg-foreground"
      aria-roledescription="carousel"
      aria-label="عروض رئيسية"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={carouselRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {lead && (
          <div
            role="group"
            aria-roledescription="slide"
            aria-label={`1 من ${total}`}
            data-active={active === 0}
            className={SLIDE_FRAME}
          >
            {lead}
          </div>
        )}

        {slides.map((slide, i) => {
          const index = i + offset;
          // With a text lead slide in front, no photo is the LCP any more, so
          // none is preloaded; the first one still loads eagerly because it
          // is next on screen.
          const imageLoading = lead
            ? { loading: i === 0 ? ("eager" as const) : undefined, fetchPriority: "low" as const }
            : { priority: i === 0 };

          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} من ${total}`}
              data-active={active === index}
              className={SLIDE_FRAME}
            >
              {/* A slow push-in while the slide is on screen. */}
              <Img
                src={slide.image}
                alt=""
                fill
                sizes="100vw"
                {...imageLoading}
                className="object-cover transition-transform duration-700 ease-out motion-safe:group-data-[active=true]/slide:scale-[1.06] motion-safe:group-data-[active=true]/slide:duration-[7000ms] motion-safe:group-data-[active=true]/slide:ease-linear"
              />
              {/*
               * Darkest behind the copy. This was `to-l from-black/20 …
               * to-black/75`, which put the lightest shade under the
               * right-aligned RTL text and the darkest over empty space.
               * Mobile stacks the copy at the bottom, so it shades upwards.
               */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/5 sm:bg-linear-to-l sm:from-black/75 sm:via-black/40 sm:to-black/0" />

              <div className="relative container mx-auto flex h-full items-end px-4 pb-16 sm:items-center sm:pb-0">
                <div className="max-w-xl text-white">
                  {/* Styled like a headline but not an <h1> — the page owns that. */}
                  <p
                    className={cn(
                      SLIDE_ENTER,
                      "text-2xl leading-tight font-bold [animation-delay:80ms] sm:text-4xl lg:text-5xl",
                    )}
                  >
                    {slide.title}
                  </p>
                  {slide.description && (
                    <p
                      className={cn(
                        SLIDE_ENTER,
                        "mt-3 text-sm opacity-90 [animation-delay:160ms] sm:text-lg",
                      )}
                    >
                      {slide.description}
                    </p>
                  )}
                  <Button
                    asChild
                    size="lg"
                    className={cn(
                      SLIDE_ENTER,
                      "mt-6 bg-accent text-accent-foreground [animation-delay:240ms] hover:bg-accent-hover",
                    )}
                  >
                    <Link href={slide.href}>{slide.cta}</Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          <button
            onClick={() => goTo((active - 1 + total) % total)}
            aria-label="الشريحة السابقة"
            className="absolute top-1/2 right-4 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-colors hover:bg-white/30 md:flex"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={() => goTo((active + 1) % total)}
            aria-label="الشريحة التالية"
            className="absolute top-1/2 left-4 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-colors hover:bg-white/30 md:flex"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
            {Array.from({ length: total }, (_, index) => {
              const isActive = index === active;
              const filling = isActive && autoplay && !paused;
              return (
                <button
                  key={index}
                  onClick={() => goTo(index)}
                  aria-label={`الانتقال إلى الشريحة ${index + 1}`}
                  aria-current={isActive}
                  className={cn(
                    "relative h-2.5 overflow-hidden rounded-full transition-all duration-300",
                    isActive
                      ? "w-8 bg-white/30"
                      : "w-2.5 bg-white/50 hover:bg-white/75",
                  )}
                >
                  {/*
                   * The active dot fills over the interval, so the autoplay
                   * timer is visible. Keyed on the slide and the pause state:
                   * the interval restarts on both, and so must the fill.
                   * Paused, it shows solid, like a plain active dot.
                   */}
                  {isActive && (
                    <span
                      key={`${active}-${filling}`}
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 origin-right rounded-full bg-accent",
                        filling && "animate-dot-fill",
                      )}
                      style={
                        filling ? { animationDuration: `${interval}ms` } : undefined
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
