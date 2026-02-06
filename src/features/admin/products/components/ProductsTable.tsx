"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  MoreVertical,
  FilePenLine,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { UpdateProductModal } from "../components/UpdateProductModal";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { getAdminProducts } from "../actions/get-products";
import { Img } from "@/shared/components/ui/Image";

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

interface RawProduct {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  created_at: string;
  stock_quantity: number;
  price: number;
  old_price: number | null;
  sale_end_date: string | null;
  is_best_seller: boolean;
  is_new: boolean;
  is_featured: boolean;
  is_special_offer: boolean;
  images: Array<{ image_url: string }>;
}

export function ProductsTable() {
  const [activeTab, setActiveTab] = useState<
    "all" | "featured" | "onSale" | "outOfStock"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", activeTab, currentPage, searchTerm],
    queryFn: async () => {
      const result = await getAdminProducts({
        page: currentPage,
        limit: 10,
        status: activeTab,
        search: searchTerm,
      });
      return result;
    },
  });

  const products: Product[] =
    (data?.products as unknown as RawProduct[])?.map((p) => ({
      id: p.id,
      name: p.name_ar || p.name_en || "", // Prefer Arabic name
      image: p.images?.[0]?.image_url || "/placeholder.jpg", // Use first image or placeholder
      createdDate: new Date(p.created_at).toLocaleDateString("ar-EG"),
      order: p.stock_quantity, // Mapping stock to order column
      price: p.price,
      oldPrice: p.old_price,
      saleEndDate: p.sale_end_date,
      bestSeller: p.is_best_seller,
      isNew: p.is_new,
      featured: p.is_featured,
      specialOffer: p.is_special_offer,
      stockQuantity: p.stock_quantity,
      images: (p.images as any) || [], // Keep as any for now or map correctly if structure matches
    })) || [];

  const totalPages = Math.ceil((data?.count || 0) / 10);

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setUpdateModalOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm("هل أنت متأكد أنك تريد حذف هذا المنتج؟")) {
      console.log("Delete product", productId);
    }
  };

  const tabCategories = [
    {
      id: "all",
      name: "كل المنتجات",
      count: data?.count || 0,
    },
    {
      id: "featured",
      name: "مميزة",
      count: 0,
    },
    {
      id: "onSale",
      name: "عروض",
      count: 0,
    },
    {
      id: "outOfStock",
      name: "نفذت الكمية",
      count: 0,
    },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            المنتجات
          </h1>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          <button className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-[#4EA674] text-white rounded-lg hover:bg-[#3d8a5e] transition-colors">
            <Plus className="w-5 h-5" />
            <span className="font-medium">إضافة منتج</span>
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center space-x-2 space-x-reverse px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  إجراءات
                </span>
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[160px]"
                align="end"
              >
                <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer outline-none text-right">
                  تصدير المنتجات
                </DropdownMenu.Item>
                <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer outline-none text-right">
                  استيراد المنتجات
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex items-center space-x-2 space-x-reverse">
              {tabCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === category.id
                      ? "bg-[#4EA674]/10 text-[#4EA674]"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {category.name}{" "}
                  {category.id === "all" && (
                    <span className="text-xs mr-1">({category.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث عن منتج..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4EA674] focus:border-transparent transition-all w-64 text-right"
                />
              </div>
              <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400">
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  اسم المنتج
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  السعر
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المخزون
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  تاريخ الإضافة
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4EA674] mb-2"></div>
                      <p>جاري تحميل المنتجات...</p>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center text-gray-500"
                  >
                    لا توجد منتجات.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0 ml-4">
                          <div className="relative h-10 w-10">
                            <Img
                              className="rounded-lg object-cover"
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="48px"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {product.price.toFixed(2)} ج.م
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {product.stockQuantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stockQuantity > 0 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          متوفر
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          غير متوفر
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {product.createdDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-[#4EA674]"
                          title="تعديل"
                        >
                          <FilePenLine className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              عرض صفحة {currentPage} من {totalPages}
            </div>
            <div className="flex space-x-2 space-x-reverse">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                title="السابق"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                title="التالي"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      <UpdateProductModal
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
        product={selectedProduct}
        onUpdate={() => {
          setUpdateModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}
