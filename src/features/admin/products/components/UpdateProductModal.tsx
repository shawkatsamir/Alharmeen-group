"use client";

import { Switch } from "@/shared/components/ui/Switch";
import { Tag, Timer, Calendar, Package } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/Dialog";
import { useUpdateProduct } from "../hooks/useUpdateProduct";

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

interface Product {
  id: string;
  name: string;
  image: string;
  createdDate: string;
  order: number;
  price: number;
  oldPrice: number | null;
  saleEndDate: string | null;
  bestSeller: boolean;
  isNew: boolean;
  featured: boolean;
  specialOffer: boolean;
  stockQuantity: number;
  images: ProductImage[];
}

interface UpdateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdate: (product: Product) => void;
}

export function UpdateProductModal({
  open,
  onOpenChange,
  product,
}: UpdateProductModalProps) {
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [bestSeller, setBestSeller] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [specialOffer, setSpecialOffer] = useState(false);

  // Offer states
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [saleEndDate, setSaleEndDate] = useState("");

  const updateProductMutation = useUpdateProduct();

  useEffect(() => {
    if (product) {
      // If there's an old_price, it means there's an active offer
      // old_price is the original price, price is the sale price
      const hasActiveOffer = product.oldPrice !== null && product.oldPrice > 0;

      if (hasActiveOffer) {
        setOfferEnabled(true);
        setPrice(product.oldPrice!.toString()); // original price
        setSalePrice(product.price.toString()); // sale price
        setSaleEndDate(
          product.saleEndDate
            ? new Date(product.saleEndDate).toISOString().slice(0, 16)
            : "",
        );
      } else {
        setOfferEnabled(false);
        setPrice(product.price.toString());
        setSalePrice("");
        setSaleEndDate("");
      }

      setStockQuantity(product.stockQuantity?.toString() || "0");
      setBestSeller(product.bestSeller);
      setIsNew(product.isNew);
      setFeatured(product.featured);
      setSpecialOffer(product.specialOffer);
    }
  }, [product]);

  const handleOfferToggle = (enabled: boolean) => {
    setOfferEnabled(enabled);
    if (!enabled) {
      // When disabling offer, clear sale fields and turn off special offer
      setSalePrice("");
      setSaleEndDate("");
      setSpecialOffer(false);
    }
  };

  const handleSpecialOfferToggle = (enabled: boolean) => {
    setSpecialOffer(enabled);
    if (enabled) {
      // When enabling special offer, auto-enable offer section
      setOfferEnabled(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      const originalPrice = parseFloat(price);
      const stock = parseInt(stockQuantity) || 0;

      // Build the update data
      const updateData: {
        price: number;
        old_price: number | null;
        sale_end_date: string | null;
        is_best_seller: boolean;
        is_new: boolean;
        is_featured: boolean;
        is_special_offer: boolean;
        stock_quantity: number;
      } = {
        price: originalPrice,
        old_price: null,
        sale_end_date: null,
        is_best_seller: bestSeller,
        is_new: isNew,
        is_featured: featured,
        is_special_offer: specialOffer,
        stock_quantity: stock,
      };

      // Validate: if specialOffer is ON, offer must be enabled with a sale price
      if (specialOffer && (!offerEnabled || !salePrice)) {
        alert("يجب تحديد سعر العرض عند تفعيل العرض الخاص");
        return;
      }

      if (offerEnabled && salePrice) {
        const salePriceNum = parseFloat(salePrice);
        // Validate sale price is less than original price
        if (salePriceNum >= originalPrice) {
          alert("سعر العرض يجب أن يكون أقل من السعر الأصلي");
          return;
        }
        // When offer is enabled: price = sale price, old_price = original price
        updateData.price = salePriceNum;
        updateData.old_price = originalPrice;
        updateData.sale_end_date = saleEndDate || null;
      }

      updateProductMutation.mutate(
        {
          id: product.id,
          data: updateData,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader className="bg-linear-to-r from-[#4EA674] to-[#3d8a5e] px-6 py-4 -mx-6 -mt-6 rounded-t-lg flex flex-row items-center justify-between space-x-reverse space-x-3 text-right">
          <div className="flex items-center space-x-3 space-x-reverse text-white">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div className="mr-3 text-right">
              <DialogTitle className="text-right text-white">
                تحديث المنتج
              </DialogTitle>
              <DialogDescription className="text-white/80 mt-0.5 text-right">
                تعديل تفاصيل وحالات المنتج
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Price Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {offerEnabled ? "السعر الأصلي" : "سعر المنتج"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm">ج.م</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#4EA674] focus:border-transparent transition-colors text-right"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Stock Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  الكمية
                </div>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="block w-full px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#4EA674] focus:border-transparent transition-colors text-right"
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>

          {/* Offer Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              إعدادات العرض
            </h3>

            {/* Enable Offer Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Timer className="w-5 h-5 text-orange-600" />
                </div>
                <div className="mr-3 text-right">
                  <label
                    htmlFor="offerEnabled"
                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    تفعيل العرض
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    إضافة سعر عرض وتاريخ انتهاء
                  </p>
                </div>
              </div>
              <Switch
                id="offerEnabled"
                checked={offerEnabled}
                onCheckedChange={handleOfferToggle}
                className={`w-11 h-6 ${
                  offerEnabled
                    ? "bg-orange-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            </div>

            {/* Offer Fields (shown when enabled) */}
            {offerEnabled && (
              <div className="space-y-4 p-4 bg-orange-50/50 dark:bg-orange-900/5 rounded-lg border border-orange-100 dark:border-orange-900/20">
                {/* Sale Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سعر العرض
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">ج.م</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-right"
                      placeholder="0.00"
                      required={offerEnabled}
                    />
                  </div>
                  {salePrice &&
                    price &&
                    parseFloat(salePrice) < parseFloat(price) && (
                      <p className="mt-1 text-xs text-green-600">
                        خصم{" "}
                        {Math.round(
                          ((parseFloat(price) - parseFloat(salePrice)) /
                            parseFloat(price)) *
                            100,
                        )}
                        %
                      </p>
                    )}
                </div>

                {/* Sale End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      تاريخ انتهاء العرض (اختياري)
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={saleEndDate}
                    onChange={(e) => setSaleEndDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="block w-full px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Product Flags */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              حالات المنتج
            </h3>

            {/* Best Seller */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⭐</span>
                </div>
                <div className="mr-3 text-right">
                  <label
                    htmlFor="bestSeller"
                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    الأكثر مبيعاً
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    تحديث كمنتج أكثر مبيعاً
                  </p>
                </div>
              </div>
              <Switch
                id="bestSeller"
                checked={bestSeller}
                onCheckedChange={setBestSeller}
                className={`w-11 h-6 ${
                  bestSeller ? "bg-[#4EA674]" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            </div>

            {/* New Product */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🆕</span>
                </div>
                <div className="mr-3 text-right">
                  <label
                    htmlFor="isNew"
                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    منتج جديد
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    عرض كمنتج جديد
                  </p>
                </div>
              </div>
              <Switch
                id="isNew"
                checked={isNew}
                onCheckedChange={setIsNew}
                className={`w-11 h-6 ${
                  isNew ? "bg-[#4EA674]" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            </div>

            {/* Featured */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💎</span>
                </div>
                <div className="mr-3 text-right">
                  <label
                    htmlFor="featured"
                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    مميز
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    عرض في الصفحة الرئيسية
                  </p>
                </div>
              </div>
              <Switch
                id="featured"
                checked={featured}
                onCheckedChange={setFeatured}
                className={`w-11 h-6 ${
                  featured ? "bg-[#4EA674]" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            </div>

            {/* Special Offer */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔥</span>
                </div>
                <div className="mr-3 text-right">
                  <label
                    htmlFor="specialOffer"
                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    عرض خاص
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    خصم لفترة محدودة
                  </p>
                </div>
              </div>
              <Switch
                id="specialOffer"
                checked={specialOffer}
                onCheckedChange={handleSpecialOfferToggle}
                className={`w-11 h-6 ${
                  specialOffer ? "bg-[#4EA674]" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <div className="flex w-full items-center justify-end space-x-3 space-x-reverse">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={updateProductMutation.isPending}
                className="px-5 py-2.5 bg-[#4EA674] text-white rounded-lg font-medium hover:bg-[#3d8a5e] transition-colors shadow-lg shadow-[#4EA674]/30 disabled:opacity-50"
              >
                {updateProductMutation.isPending
                  ? "جاري الحفظ..."
                  : "حفظ التغييرات"}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
