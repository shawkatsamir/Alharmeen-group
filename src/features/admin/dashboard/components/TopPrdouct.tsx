import { Img } from "@/shared/components/ui/Image";
import { Search } from "lucide-react";

export function TopProducts() {
  const products = [
    {
      name: "Apple iPhone 13",
      id: "178-09-0224 DAT",
      price: "$999.00",
      image:
        "https://images.unsplash.com/photo-1632633173522-37b369e66317?w=100&h=100&fit=crop",
    },
    {
      name: "Apple Watch",
      id: "178-09-0224 DAT",
      price: "$999.00",
      image:
        "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=100&h=100&fit=crop",
    },
    {
      name: "Apple MacBook Pro",
      id: "178-09-0224 DAT",
      price: "$999.00",
      image:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop",
    },
    {
      name: "Apple AirPods",
      id: "178-09-0224 DAT",
      price: "$999.00",
      image:
        "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=100&h=100&fit=crop",
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="border-b border-border p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            أعلى المنتجات مبيعاً
          </h2>
          <button className="min-h-11 px-2 text-sm font-medium text-primary hover:text-primary/80">
            كل المنتجات
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="بحث"
            className="h-11 w-full rounded-lg border border-input bg-input-background ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
        </div>
      </div>

      <div className="divide-y divide-border">
        {products.map((product, index) => (
          <div key={index} className="p-3 transition-colors hover:bg-primary-soft sm:p-4">
            <div className="flex items-center gap-4">
              {" "}
              {/* 1. Outer container: Just handles layout (removed w-12 h-12) */}
              {/* 2. Image Wrapper: This controls the size of the image ONLY */}
              <div className="relative w-12 h-12 shrink-0">
                <Img
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="48px"
                  className="rounded-lg object-cover"
                />
              </div>
              {/* 3. Text Section */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {product.id}
                </p>
              </div>
              {/* 4. Price Section */}
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {product.price}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
