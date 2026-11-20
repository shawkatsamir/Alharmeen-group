"use client";

import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { Section } from "@/shared/components/ui/Section";
import { ProductCard } from "./ProductCard";
import { collapseVariants } from "../lib/variant-group";
import { Product } from "../types";

interface ProductSliderProps {
  title: string;
  subtitle?: string;
  products: Product[];
  seeMoreLink?: string;
  wishlistIds?: string[];
}

const ARROW =
  "absolute top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised p-2 text-muted-foreground opacity-0 shadow-lg transition-[opacity,background-color,color] duration-300 hover:bg-primary-soft hover:text-primary focus-visible:opacity-100 md:flex group-hover/rail:opacity-100";

export default function ProductSlider({
  title,
  subtitle,
  products,
  seeMoreLink,
  wishlistIds,
}: ProductSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const slider = sliderRef.current;
    if (slider) {
      const scrollAmount = direction === "left" ? -300 : 300;
      slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    /*
     * Through `Section` so rails share the heading, spacing and reveal of every
     * other block. This used to be its own `bg-white` band with Tailwind's
     * `blue-600` — a second, brighter blue than the brand primary.
     */
    <Section title={title} subtitle={subtitle} seeMoreLink={seeMoreLink}>
      {/*
        Named group. A bare `group` here would also match every ProductCard's
        `group-hover:` utilities, because Tailwind compiles those to a
        descendant selector against *any* `.group` ancestor — which made
        hovering anywhere in the rail light up every card at once.
      */}
      <div className="group/rail relative">
        <button
          onClick={() => scroll("left")}
          className={`${ARROW} -left-4`}
          aria-label="التمرير لليسار"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </button>

        <button
          onClick={() => scroll("right")}
          className={`${ARROW} -right-4`}
          aria-label="التمرير لليمين"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div
          ref={sliderRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pt-1 pb-4"
        >
          {/*
            Collapsed for the same reason as ProductGrid: a rail that shows
            the same fridge in three finishes wastes three of its handful of
            visible slots on one product.
          */}
          {collapseVariants(products).map(({ representative, members }) => (
            <div
              key={representative.id}
              className="w-[200px] flex-none snap-start md:w-[240px] lg:w-[260px]"
            >
              <ProductCard
                product={representative}
                variants={members}
                isWishlisted={wishlistIds?.includes(representative.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
