"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

const slides = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1740803292814-13d2e35924c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcHBsaWFuY2UlMjBzdG9yZXxlbnwxfHx8fDE3NjE2NzU1ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "تخفيضات رأس السنة",
    subtitle: "خصم يصل إلى 50٪ على الأجهزة المنزلية",
    description: "تسوق أحدث المجموعات من أفضل العلامات التجارية",
    cta: "تسوق الآن",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1700847304964-9fe563059742?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljcyUyMGRpc2NvdW50JTIwc2FsZXxlbnwxfHx8fDE3NjE2NzU1ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "ثورة المنزل الذكي",
    subtitle: "حوّل مساحة معيشتك",
    description: "اختبر المستقبل مع أجهزة المنزل الذكي",
    cta: "استكشف",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1740803292349-c7e53f7125b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwYXBwbGlhbmNlcyUyMHNob3BwaW5nfGVufDF8fHx8MTc2MTY3NTU4Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    title: "مجموعة أساسيات المطبخ",
    subtitle: "جودة عالية، أسعار مناسبة",
    description: "طور مطبخك بأفضل الأجهزة",
    cta: "اكتشف",
  },
];

export default function HeroCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToSlide = (index: number) => {
    if (!carouselRef.current) return;
    const slideWidth = carouselRef.current.offsetWidth;
    carouselRef.current.scrollTo({
      left: slideWidth * index,
      behavior: "smooth",
    });
  };

  const scrollBy = (direction: "prev" | "next") => {
    if (!carouselRef.current) return;
    const slideWidth = carouselRef.current.offsetWidth;
    const scrollAmount = direction === "next" ? slideWidth : -slideWidth;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className="relative h-[500px] md:h-[600px] bg-gray-900">
      <div
        ref={carouselRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="relative h-full w-full shrink-0 snap-center"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Content */}
            <div className="relative container mx-auto px-4 h-full flex items-center">
              <div className="max-w-2xl text-white">
                <h1 className="text-4xl md:text-6xl mb-4">{slide.title}</h1>
                <h2 className="text-2xl md:text-3xl mb-4">{slide.subtitle}</h2>
                <p className="text-lg md:text-xl mb-8 opacity-90">
                  {slide.description}
                </p>
                <Button size="lg" variant="default" className="text-lg px-8">
                  {slide.cta}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => scrollBy("prev")}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all z-10"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={() => scrollBy("next")}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all z-10"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            className="w-3 h-3 rounded-full bg-white/50 hover:bg-white/70 transition-all"
          />
        ))}
      </div>
    </div>
  );
}
