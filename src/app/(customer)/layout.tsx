import Header from "@/shared/components/layout/Header";
import Footer from "@/shared/components/layout/Footer";
import { MobileBottomNav } from "@/shared/components/layout/MobileBottomNav";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
