"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Plus,
  MoreVertical,
  FilePenLine,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Img } from "@/shared/components/ui/Image";
import { DebouncedSearchInput } from "@/features/search/components/DebouncedSearchInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/AlertDialog";

import { archiveProduct, restoreProduct } from "../actions/archive-product";
import {
  getAdminProductCounts,
  getAdminProducts,
  type AdminProductStatus,
} from "../actions/get-products";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  image: string;
  createdDate: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
}

interface RawProduct {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  created_at: string;
  stock_quantity: number;
  price: number;
  is_active: boolean;
  images: { image_url: string; is_primary: boolean }[];
}

const TABS: { id: AdminProductStatus; name: string }[] = [
  { id: "all", name: "كل المنتجات" },
  { id: "featured", name: "مميزة" },
  { id: "onSale", name: "عروض" },
  { id: "outOfStock", name: "نفذت الكمية" },
  { id: "archived", name: "مؤرشف" },
];

export function ProductsTable() {
  const [activeTab, setActiveTab] = useState<AdminProductStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [effectiveSearchTerm, setEffectiveSearchTerm] = useState("");
  const [pendingArchive, setPendingArchive] = useState<Product | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", activeTab, currentPage, effectiveSearchTerm],
    queryFn: () =>
      getAdminProducts({
        page: currentPage,
        limit: 10,
        status: activeTab,
        search: effectiveSearchTerm,
      }),
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-product-counts", effectiveSearchTerm],
    queryFn: () => getAdminProductCounts(effectiveSearchTerm),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const result = archived ? await restoreProduct(id) : await archiveProduct(id);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-counts"] });
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setPendingArchive(null),
  });

  const products: Product[] =
    (data?.products as unknown as RawProduct[])?.map((p) => ({
      id: p.id,
      name: p.name_ar || p.name_en || "",
      image:
        p.images?.find((img) => img.is_primary)?.image_url ||
        p.images?.[0]?.image_url ||
        "/placeholder.jpg",
      createdDate: new Date(p.created_at).toLocaleDateString("ar-EG"),
      price: p.price,
      stockQuantity: p.stock_quantity,
      isActive: p.is_active,
    })) || [];

  const totalPages = Math.ceil((data?.count || 0) / 10);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            المنتجات
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/products/new"
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-[#4EA674] text-white rounded-lg hover:bg-[#3d8a5e] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">إضافة منتج</span>
          </Link>
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
                <DropdownMenu.Item asChild>
                  <Link
                    href="/admin/products/media"
                    className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer outline-none text-right"
                  >
                    وسائط المنتجات
                  </Link>
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
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-[#4EA674]/10 text-[#4EA674]"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.name}
                  {counts && (
                    <span className="text-xs mr-1">({counts[tab.id]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center space-x-3">
              <DebouncedSearchInput
                placeholder="بحث برمز المنتج SKU (3 أحرف على الأقل)"
                onSearch={(term) => {
                  setEffectiveSearchTerm(term);
                  setCurrentPage(1);
                }}
                className="w-64"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                {["اسم المنتج", "السعر", "المخزون", "الحالة", "تاريخ الإضافة"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ),
                )}
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
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="text-sm font-medium text-gray-900 hover:text-[#4EA674] dark:text-white"
                          >
                            {product.name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatCurrency(product.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {product.stockQuantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!product.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          مؤرشف
                        </span>
                      ) : product.stockQuantity > 0 ? (
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
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-[#4EA674]"
                          title="تعديل"
                        >
                          <FilePenLine className="w-4 h-4" />
                        </Link>
                        {product.isActive ? (
                          <button
                            onClick={() => setPendingArchive(product)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500"
                            title="أرشفة"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              archiveMutation.mutate({
                                id: product.id,
                                archived: true,
                              })
                            }
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-[#4EA674]"
                            title="استعادة"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        )}
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

      <AlertDialog
        open={pendingArchive !== null}
        onOpenChange={(open) => !open && setPendingArchive(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>أرشفة المنتج؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيختفي «{pendingArchive?.name}» من المتجر ومن نتائج البحث، لكن
              بياناته وطلباته السابقة تبقى محفوظة. يمكنك استعادته في أي وقت من
              تبويب «مؤرشف».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingArchive &&
                archiveMutation.mutate({ id: pendingArchive.id, archived: false })
              }
            >
              أرشفة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
