import { Database } from "@/shared/types/database.types";
import { useEffect, useState } from "react";
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

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name_ar,
      price: product.price,
      image: product.images?.[0]?.image_url || "/placeholder.jpg",
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
                src={product.images?.[0]?.image_url || "/placeholder.jpg"}
                alt={product.name_ar}
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
          </div>

          {/* Right: Product Info */}
          <div className="bg-white rounded-lg p-6 lg:p-8">
            {/* Brand */}
            <p className="text-gray-500 mb-2">{product.brand?.name_ar}</p>

            {/* Product Name */}
            <h1 className="mb-4">{product.name_ar}</h1>

            {/* Rating & Reviews */}

            <Separator className="mb-6" />

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-primary">
                  {product.price.toLocaleString()} ج.م
                </span>
                {product.old_price && (
                  <>
                    <span className="text-gray-400 line-through">
                      {product.old_price.toLocaleString()} ج.م
                    </span>
                    <Badge variant="destructive">
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
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-600">متوفر في المخزون</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-red-600" />
                  <span className="text-red-600">غير متوفر حالياً</span>
                </>
              )}
            </div>

            {/* Features */}
            <div className="mb-6">
              <h3 className="mb-3">المميزات الرئيسية:</h3>
              <ul className="space-y-2">
                {product.features?.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator className="mb-6" />

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
              <Button className="max-w-fit" size="lg" onClick={handleAddToCart}>
                <ShoppingCart className="w-4 h-4 ml-2" />
                أضف للسلة
              </Button>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-lg p-6 mb-12">
          <Tabs defaultValue="description" dir="rtl">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description">الوصف</TabsTrigger>
              <TabsTrigger value="specifications">المواصفات</TabsTrigger>
              <TabsTrigger value="reviews">التقييمات</TabsTrigger>
              <TabsTrigger value="shipping">الشحن</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div className="prose max-w-none">
                <h3 className="mb-4">وصف المنتج</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {product.description_ar}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="specifications" className="mt-6">
              <h3 className="mb-4">مواصفات المنتج</h3>
              {product.specifications ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <tbody className="divide-y">
                      {Object.entries(
                        product.specifications as Record<string, unknown>,
                      ).map(([key, value]) => (
                        <tr key={key} className="bg-white">
                          <td className="px-6 py-4 font-medium text-gray-900 bg-gray-50 w-1/3">
                            {key
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {typeof value === "object" && value !== null ? (
                              <div className="flex flex-col gap-1">
                                {Object.entries(value).map(
                                  ([subKey, subValue]) => (
                                    <div
                                      key={subKey}
                                      className="flex items-center gap-2"
                                    >
                                      <span className="font-medium text-gray-500">
                                        {subKey
                                          .replace(/_/g, " ")
                                          .replace(/\b\w/g, (l) =>
                                            l.toUpperCase(),
                                          )}
                                        :
                                      </span>
                                      <span>{String(subValue)}</span>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              String(value)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">
                  لا توجد مواصفات إضافية لهذا المنتج
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Video */}

        <ProductVideos videos={product.video_urls as unknown as VideoUrls} />
      </div>
    </div>
  );
};
