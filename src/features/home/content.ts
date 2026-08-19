import type { HeroSlide } from "./components/HeroCarousel";
import type { Campaign } from "./components/CampaignBand";

/**
 * Editorial copy for the homepage.
 *
 * Kept as config rather than hardcoded in the page so seasonal changes are a
 * one-file edit, and so it can move into the database later without touching
 * the components.
 */

export const ANNOUNCEMENT =
  "شحن لجميع محافظات مصر · الدفع عند الاستلام · ضمان الوكيل المعتمد";

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "offers",
    image:
      "https://images.unsplash.com/photo-1740803292814-13d2e35924c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920",
    eyebrow: "عروض محدودة",
    title: "أجهزتك المنزلية بأفضل سعر",
    description: "خصومات على تشكيلة واسعة من الثلاجات والغسالات والبوتاجازات",
    cta: "تسوق العروض",
    href: "/offers",
  },
  {
    id: "dealer",
    image:
      "https://images.unsplash.com/photo-1700847304964-9fe563059742?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920",
    eyebrow: "وكيل معتمد",
    title: "منتجات أصلية بضمان الوكيل",
    description: "تورنيدو، شارب، توشيبا، هوفر، هيتاشي ولاجيرمانيا",
    cta: "تعرف على الماركات",
    href: "/best-sellers",
  },
  {
    id: "kitchen",
    image:
      "https://images.unsplash.com/photo-1740803292349-c7e53f7125b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920",
    eyebrow: "أساسيات المطبخ",
    title: "كل اللي مطبخك محتاجه",
    description: "ميكروويف، غسالات أطباق، شفاطات وأجهزة تحضير الطعام",
    cta: "اكتشف الآن",
    href: "/featured",
  },
];

export const CAMPAIGNS: Campaign[] = [
  {
    id: "laundry",
    title: "يوم غسيل أسهل",
    body: "غسالات فول أوتوماتيك بسعات من 7 إلى 15 كجم، بتقنية الإنفرتر وضمان الوكيل.",
    cta: "تصفح الغسالات",
    href: "/large-appliances/washing-machines",
    tone: "primary",
  },
  {
    id: "cooling",
    title: "تبريد يدوم أطول",
    body: "ثلاجات نوفروست بسعات مختلفة تحافظ على طعامك طازجاً لفترة أطول.",
    cta: "تصفح الثلاجات",
    href: "/large-appliances/refrigerators",
    tone: "accent",
  },
];
