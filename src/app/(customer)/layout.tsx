import Header from "@/shared/components/layout/Header";
import Footer from "@/shared/components/layout/Footer";
import { MobileBottomNav } from "@/shared/components/layout/MobileBottomNav";
import { getNavigationCategories } from "@/services/server/categories";
import { WishlistProvider } from "@/features/wishlist/context/wishlist-context";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getNavigationCategories();

  return (
    <div className="flex flex-col min-h-screen">
      <WishlistProvider>
        <Header />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav categories={categories} />
      </WishlistProvider>
    </div>
  );
}
