import ProductSlider from "@/features/products/components/ProductSlider";
import {
  getBestSellerProducts,
  getBrands,
  getFeaturedProducts,
  getOffers,
} from "@/services/server/products";
import { getCategoryTiles } from "@/services/server/categories";
import { Section } from "@/shared/components/ui/Section";
import { AnnouncementBar } from "@/features/home/components/AnnouncementBar";
import { HeroCarousel } from "@/features/home/components/HeroCarousel";
import { TrustBar } from "@/features/home/components/TrustBar";
import { CategoryGrid } from "@/features/home/components/CategoryGrid";
import { CampaignBand } from "@/features/home/components/CampaignBand";
import { BrandStrip } from "@/features/home/components/BrandStrip";
import { SubcategoryLinks } from "@/features/home/components/SubcategoryLinks";
import { ANNOUNCEMENT, CAMPAIGNS, HERO_SLIDES } from "@/features/home/content";

export const revalidate = 3600;

export default async function Home() {
  const [offers, bestSellers, featured, categories, brands] = await Promise.all([
    getOffers({ limit: 12 }),
    getBestSellerProducts({ limit: 12 }),
    getFeaturedProducts({ limit: 12 }),
    getCategoryTiles(),
    getBrands(),
  ]);

  // 16 of 24 categories hold no products — linking to an empty listing is a
  // dead end, so only populated ones surface.
  const populatedCategories = categories.filter((c) => c.productCount > 0);

  return (
    /*
     * No <main> here — `(customer)/layout.tsx` already renders one, and nesting
     * them is invalid.
     */
    <>
      <h1 className="sr-only">
        الحرمين جروب — وكيل معتمد للأجهزة المنزلية والكهربائية في مصر
      </h1>

      <AnnouncementBar message={ANNOUNCEMENT} />
      <HeroCarousel slides={HERO_SLIDES} />
      <TrustBar />

      {populatedCategories.length > 0 && (
        <Section
          title="تسوق حسب القسم"
          subtitle="كل الأجهزة اللي بيتك محتاجها في مكان واحد"
        >
          <CategoryGrid categories={populatedCategories} />
        </Section>
      )}

      {offers.length > 0 && (
        <ProductSlider
          title="عروض خاصة"
          products={offers}
          seeMoreLink="/offers"
        />
      )}

      <Section>
        <CampaignBand campaigns={CAMPAIGNS} />
      </Section>

      {bestSellers.length > 0 && (
        <ProductSlider
          title="الأكثر مبيعاً"
          products={bestSellers}
          seeMoreLink="/best-sellers"
        />
      )}

      {brands.length > 0 && (
        <Section title="أشهر الماركات" subtitle="وكلاء معتمدون لأكبر العلامات">
          <BrandStrip brands={brands} />
        </Section>
      )}

      {featured.length > 0 && (
        <ProductSlider
          title="اخترنا لك"
          products={featured}
          seeMoreLink="/featured"
        />
      )}

      {populatedCategories.length > 0 && (
        <Section title="تصفح كل الأقسام" tone="raised">
          <SubcategoryLinks categories={populatedCategories} />
        </Section>
      )}
    </>
  );
}
