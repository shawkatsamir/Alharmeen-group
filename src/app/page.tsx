import HeroCarousel from "@/shared/components/ui/HeroCarousel";
import ProductSlider from "@/features/products/components/ProductSlider";
import { getOffers } from "@/services/server/products";

export default async function Home() {
  const offers = await getOffers({ limit: 10 });

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
    </main>
  );
}
