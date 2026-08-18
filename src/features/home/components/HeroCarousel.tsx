"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Img } from "@/shared/components/ui/Image";
import { Button } from "@/shared/components/ui/Button";

export interface HeroSlide {
  id: string;
  image: string;
  eyebrow?: string;
  title: string;
  description?: string;
  cta: string;
  href: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  /** Milliseconds between auto-advances. 0 disables autoplay. */
  interval?: number;
}

export function HeroCarousel({ slides, interval = 6000 }: HeroCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

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
    if (interval <= 0 || paused || slides.length < 2) return;
    const id = setInterval(() => {
      goTo((active + 1) % slides.length);
    }, interval);
    return () => clearInterval(id);
  }, [active, goTo, interval, paused, slides.length]);

  if (slides.length === 0) return null;

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
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} من ${slides.length}`}
            /* Aspect ratio rather than a fixed height, so mobile is not letterboxed. */
            className="relative aspect-[4/5] w-full shrink-0 snap-center sm:aspect-[16/9] lg:aspect-[21/9]"
          >
            <Img
              src={slide.image}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-l from-black/20 via-black/50 to-black/75" />

            <div className="relative container mx-auto flex h-full items-center px-4">
              <div className="max-w-xl text-white">
                {slide.eyebrow && (
                  <span className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                    {slide.eyebrow}
                  </span>
                )}
                {/* Styled like a headline but not an <h1> — the page owns that. */}
                <p className="text-2xl leading-tight font-bold sm:text-4xl lg:text-5xl">
                  {slide.title}
                </p>
                {slide.description && (
                  <p className="mt-3 text-sm opacity-90 sm:text-lg">
                    {slide.description}
                  </p>
                )}
                <Button
                  asChild
                  size="lg"
                  className="mt-6 bg-accent text-accent-foreground hover:bg-accent-hover"
                >
                  <Link href={slide.href}>{slide.cta}</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => goTo((active - 1 + slides.length) % slides.length)}
            aria-label="الشريحة السابقة"
            className="absolute top-1/2 right-4 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/35 md:flex"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={() => goTo((active + 1) % slides.length)}
            aria-label="الشريحة التالية"
            className="absolute top-1/2 left-4 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/35 md:flex"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goTo(index)}
                aria-label={`الانتقال إلى الشريحة ${index + 1}`}
                aria-current={index === active}
                className={`h-2.5 rounded-full transition-all ${
                  index === active
                    ? "w-7 bg-accent"
                    : "w-2.5 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
