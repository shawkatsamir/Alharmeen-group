import HeroCarousel from "@/shared/components/ui/HeroCarousel";
import ProductSlider from "@/features/products/components/ProductSlider";
import {
  getOffers,
  getBestSellerProducts,
  getFeaturedProducts,
} from "@/services/server/products";

export default async function Home() {
  const offers = await getOffers({ limit: 10 });
  const bestSellers = await getBestSellerProducts({ limit: 10 });
  const featured = await getFeaturedProducts({ limit: 10 });

  return (
    <main>
      <HeroCarousel />
      {offers.length > 0 && (
        <ProductSlider
          title="عروض خاصة"
          products={offers}
          seeMoreLink="/offers"
        />
      )}
      {bestSellers.length > 0 && (
        <ProductSlider
          title="الأكثر مبيعاً"
          products={bestSellers}
          seeMoreLink="/best-sellers"
        />
      )}
      {featured.length > 0 && (
        <ProductSlider
          title="اخترنا لك"
          products={featured}
          seeMoreLink="/featured"
        />
      )}
    </main>
  );
}
