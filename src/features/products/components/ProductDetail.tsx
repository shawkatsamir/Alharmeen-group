import { Database } from "@/shared/types/database.types";
import { useEffect, useState, useMemo } from "react";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Img } from "@/shared/components/ui/Image";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Check, Heart, Share2, ShoppingCart, X } from "lucide-react";
import { Separator } from "@/shared/components/ui/Separator";
import {
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger,
} from "@/shared/components/ui/Tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/Breadcrumb";
import Link from "next/link";
import {
  ProductVideos,
  VideoUrls,
} from "@/features/products/components/ProductVideos";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  brand?: Database["public"]["Tables"]["brands"]["Row"];
  category?: Database["public"]["Tables"]["categories"]["Row"];
  images?: Database["public"]["Tables"]["product_images"]["Row"][];
};

interface ProductDetailProps {
  product: Product;
}

export const ProductDetail = ({ product }: ProductDetailProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartItem = useCartStore((state) =>
    state.items.find((i) => i.id === product.id),
  );
  const quantity = cartItem?.quantity || 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Sort images by is_primary (true first) then display_order
  const sortedImages = useMemo(() => {
    if (!product.images || product.images.length === 0) return [];

    return [...product.images].sort((a, b) => {
      // First sort by is_primary
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;

      // Then sort by display_order
      return (a.display_order || 0) - (b.display_order || 0);
    });
  }, [product.images]);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    sortedImages.length > 0 ? sortedImages[0].id : null,
  );

  const selectedImage = useMemo(() => {
    if (!selectedImageId && sortedImages.length > 0) return sortedImages[0];
    return (
      sortedImages.find((img) => img.id === selectedImageId) || sortedImages[0]
    );
  }, [selectedImageId, sortedImages]);

  const handleAddToCart = () => {
    const primaryImage =
      sortedImages.length > 0 ? sortedImages[0].image_url : "/placeholder.jpg";
    addItem({
      id: product.id,
      name: product.name_ar,
      price: product.price,
      image: primaryImage,
      slug: product.slug,
      brand: product.brand?.name_ar || "",
    });
    toast.success("تم إضافة المنتج إلى السلة");
  };

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name_ar}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {/* Product Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left: Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200">
              <Img
                src={selectedImage?.image_url || "/placeholder.jpg"}
                alt={selectedImage?.alt_text_ar || product.name_ar}
                fill
                className="object-cover"
              />

              {/* Wishlist & Share */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                >
                  <Heart className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Thumbnails */}
            {sortedImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 smooth-scroll max-w-full w-full">
                {sortedImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageId(img.id)}
                    className={`relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-white border-2 transition-all duration-200 ${
                      selectedImage?.id === img.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-gray-200 hover:border-primary/50"
                    }`}
                  >
                    <Img
                      src={img.image_url}
                      alt={img.alt_text_ar || product.name_ar}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="bg-white rounded-lg p-6 lg:p-8">
            {/* Brand */}
            <p className="text-gray-500 mb-2">{product.brand?.name_ar}</p>

            {/* Product Name */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {product.name_ar}
            </h1>

            <Separator className="mb-6" />

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-primary">
                  {product.price.toLocaleString()} ج.م
                </span>
                {product.old_price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      {product.old_price.toLocaleString()} ج.م
                    </span>
                    <Badge variant="destructive" className="mr-2">
                      وفر {(product.old_price - product.price).toLocaleString()}{" "}
                      ج.م
                    </Badge>
                  </>
                )}
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-6">
              {product.is_available && product.stock_quantity > 0 ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <Check className="w-4 h-4" />
                  <span>متوفر في المخزون</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                  <X className="w-4 h-4" />
                  <span>غير متوفر حالياً</span>
                </div>
              )}
            </div>

            {/* Features (Bullet Points from JSON) */}
            {product.features && Array.isArray(product.features) && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  المميزات الرئيسية:
                </h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-gray-700">{String(feature)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator className="mb-6" />

            {/* Add to Cart Actions */}
            {mounted && quantity > 0 ? (
              <div className="flex items-center gap-3 max-w-fit">
                <div className="flex items-center justify-between min-w-[140px] border rounded-md h-12 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateQuantity(quantity - 1)}
                  >
                    -
                  </Button>
                  <span className="font-medium text-lg">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full md:w-auto min-w-[200px]"
                size="lg"
                onClick={handleAddToCart}
                disabled={!product.is_available || product.stock_quantity <= 0}
              >
                <ShoppingCart className="w-5 h-5 ml-2" />
                {product.is_available && product.stock_quantity > 0
                  ? "أضف للسلة"
                  : "نفذت الكمية"}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs Section (Description & Specs) */}
        <div className="bg-white rounded-lg p-6 mb-12 border border-gray-100 shadow-sm">
          <Tabs defaultValue="description" dir="rtl">
            <TabsList className="w-full justify-start border-b rounded-lg p-0 h-auto bg-transparent">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                الوصف
              </TabsTrigger>
              <TabsTrigger
                value="specifications"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                المواصفات
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                التقييمات
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                الشحن
              </TabsTrigger>
            </TabsList>

            {/* 📝 DESCRIPTION TAB (Rendered as HTML) */}
            <TabsContent value="description" className="mt-8">
              <div
                className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:space-y-1 [&_li]:marker:text-primary"
                dir="rtl"
                dangerouslySetInnerHTML={{
                  __html: product.description_ar || "",
                }}
              />
            </TabsContent>

            {/* 📊 SPECIFICATIONS TAB (Clean Table) */}
            <TabsContent value="specifications" className="mt-8">
              {product.specifications &&
              Object.keys(product.specifications as object).length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(
                        product.specifications as Record<string, unknown>,
                      ).map(([key, value]) => (
                        <tr
                          key={key}
                          className="bg-white hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-50/50 w-1/3 border-l">
                            {key.replace(/_/g, " ")}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {typeof value === "object" && value !== null
                              ? JSON.stringify(value)
                              : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">
                  لا توجد مواصفات إضافية متاحة لهذا المنتج
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-8">
              <p className="text-gray-500">التقييمات قريباً...</p>
            </TabsContent>

            <TabsContent value="shipping" className="mt-8">
              <p className="text-gray-500">سياسة الشحن قريباً...</p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Video Section */}
        {product.video_urls && (
          <ProductVideos videos={product.video_urls as unknown as VideoUrls} />
        )}
      </div>
    </div>
  );
};
