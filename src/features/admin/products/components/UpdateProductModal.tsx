"use client";

import { Switch } from "@/shared/components/ui/Switch";
import { Tag } from "lucide-react";
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
  image: string; // fallback or main image url
  createdDate: string;
  order: number;
  price: number;
  bestSeller: boolean;
  isNew: boolean;
  featured: boolean;
  specialOffer: boolean;
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
  onUpdate,
}: UpdateProductModalProps) {
  const [price, setPrice] = useState("");
  const [bestSeller, setBestSeller] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [specialOffer, setSpecialOffer] = useState(false);

  const updateProductMutation = useUpdateProduct();

  useEffect(() => {
    if (product) {
      setPrice(product.price.toString());
      setBestSeller(product.bestSeller);
      setIsNew(product.isNew);
      setFeatured(product.featured);
      setSpecialOffer(product.specialOffer);
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      updateProductMutation.mutate(
        {
          id: product.id,
          data: {
            price: parseFloat(price),
            is_best_seller: bestSeller,
            is_new: isNew,
            is_featured: featured,
            is_special_offer: specialOffer,
          },
        },
        {
          onSuccess: (resultUserId) => {
            // The hook handles toast and invalidation.
            // We can optionally close the modal here or rely on parent.
            // But the parent passed onUpdate. Ideally we should call onUpdate if we want optmistic UI or just close.
            // Given the hook invalidates queries, we can just close.
            onOpenChange(false);
          },
        },
      );
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader className="bg-gradient-to-r from-[#4EA674] to-[#3d8a5e] px-6 py-4 -mx-6 -mt-6 rounded-t-lg flex flex-row items-center justify-between space-x-reverse space-x-3 text-right">
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
          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              سعر المنتج
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
                onCheckedChange={setSpecialOffer}
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
