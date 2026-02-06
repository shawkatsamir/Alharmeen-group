"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Product } from "../types";

interface ProductSliderProps {
  title: string;
  products: Product[];
  seeMoreLink?: string;
  wishlistIds?: string[];
}

export default function ProductSlider({
  title,
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
    <div className="py-8 bg-white mb-4">
      <div className="container mx-auto px-4 relative">
        {/* --- Header Section --- */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-800 border-r-4 border-blue-600 pr-3">
            {title}
          </h2>
          {seeMoreLink && (
            <Link
              href={seeMoreLink}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              عرض الكل
            </Link>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border rounded-full p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Scroll Left"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>

          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border rounded-full p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-none w-[200px] md:w-[240px] lg:w-[260px] snap-start"
              >
                <ProductCard
                  product={product}
                  isWishlisted={wishlistIds?.includes(product.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
