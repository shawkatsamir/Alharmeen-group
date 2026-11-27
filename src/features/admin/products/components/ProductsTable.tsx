"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  Loader2,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Img } from "@/shared/components/ui/Image";
import { Button } from "@/shared/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu";
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
import { cn, formatCurrency, formatDateShort } from "@/lib/utils";

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
      const result = archived
        ? await restoreProduct(id)
        : await archiveProduct(id);
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
      createdDate: formatDateShort(p.created_at),
      price: p.price,
      stockQuantity: p.stock_quantity,
      isActive: p.is_active,
    })) || [];

  const totalPages = Math.ceil((data?.count || 0) / 10);

  return (
    /*
     * No `p-6` here. The admin layout already pads `main`, so this component's
     * own padding stacked on top of it and a 390px phone lost 96px of width
     * to nested gutters.
     */
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-end gap-2">
        <Button asChild className="h-11 gap-2">
          <Link href="/admin/products/new">
            <Plus className="size-5" />
            إضافة منتج
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 gap-2">
              <span className="hidden sm:inline">إجراءات</span>
              <MoreVertical className="size-4" />
              <span className="sr-only sm:hidden">إجراءات</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem asChild>
              <Link href="/admin/products/media" className="cursor-pointer">
                وسائط المنتجات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/products/groups" className="cursor-pointer">
                مجموعات المنتجات
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-card border-border overflow-hidden rounded-xl border">
        <div className="border-border space-y-3 border-b p-3 sm:p-4 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:space-y-0">
          <div
            role="tablist"
            aria-label="تصفية المنتجات"
            className="no-scrollbar -mx-3 flex snap-x gap-1 overflow-x-auto px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:flex-wrap lg:px-0"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "focus-visible:ring-ring/50 flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  {tab.name}
                  {counts && (
                    <span className="text-xs tabular-nums opacity-80">
                      ({counts[tab.id]})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <DebouncedSearchInput
            placeholder="بحث برمز المنتج SKU (3 أحرف على الأقل)"
            onSearch={(term) => {
              setEffectiveSearchTerm(term);
              setCurrentPage(1);
            }}
            className="w-full lg:w-64"
          />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 py-20">
            <Loader2 className="text-primary size-8 animate-spin" />
            <p>جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-muted-foreground px-6 py-20 text-center">
            {effectiveSearchTerm
              ? "لا توجد منتجات مطابقة لهذا البحث."
              : "لا توجد منتجات في هذا التبويب."}
          </div>
        ) : (
          <>
            {/* Phone: one card per product. */}
            <ul className="divide-border divide-y md:hidden">
              {products.map((product) => (
                <li key={product.id} className="flex items-start gap-1 p-3">
                  {/*
                   * The whole row is the link to the editor. As a bare text
                   * link the product name was a 20px-tall target; the card
                   * body gives it 64px and matches where a thumb lands.
                   */}
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="hover:bg-primary-soft/40 focus-visible:ring-ring/50 -m-1 flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                  >
                    <span className="bg-surface-sunken relative size-16 shrink-0 overflow-hidden rounded-lg">
                      <Img
                        className="object-cover"
                        src={product.image}
                        alt=""
                        fill
                        sizes="64px"
                      />
                    </span>

                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="text-foreground line-clamp-2 block text-sm font-medium">
                        {product.name}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-foreground text-sm font-semibold tabular-nums">
                          {formatCurrency(product.price)}
                        </span>
                        <StockBadge product={product} />
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        المخزون {product.stockQuantity} · أضيف{" "}
                        {product.createdDate}
                      </span>
                    </span>
                  </Link>

                  <RowActions
                    product={product}
                    onArchive={() => setPendingArchive(product)}
                    onRestore={() =>
                      archiveMutation.mutate({
                        id: product.id,
                        archived: true,
                      })
                    }
                  />
                </li>
              ))}
            </ul>

            {/* Desktop: the full table. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-surface-sunken border-border border-b">
                  <tr>
                    {[
                      "اسم المنتج",
                      "السعر",
                      "المخزون",
                      "الحالة",
                      "تاريخ الإضافة",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tracking-wide"
                      >
                        {heading}
                      </th>
                    ))}
                    <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-primary-soft/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-surface-sunken relative size-10 shrink-0 overflow-hidden rounded-lg">
                            <Img
                              className="object-cover"
                              src={product.image}
                              alt=""
                              fill
                              sizes="40px"
                            />
                          </div>
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="text-foreground hover:text-primary text-sm font-medium"
                          >
                            {product.name}
                          </Link>
                        </div>
                      </td>
                      <td className="text-foreground px-4 py-3 text-sm tabular-nums whitespace-nowrap">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm tabular-nums">
                        {product.stockQuantity}
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge product={product} />
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm whitespace-nowrap">
                        {product.createdDate}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            title="تعديل"
                            aria-label={`تعديل ${product.name}`}
                            className="text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                          >
                            <FilePenLine className="size-4" />
                          </Link>
                          {product.isActive ? (
                            <button
                              onClick={() => setPendingArchive(product)}
                              title="أرشفة"
                              aria-label={`أرشفة ${product.name}`}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                            >
                              <Archive className="size-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                archiveMutation.mutate({
                                  id: product.id,
                                  archived: true,
                                })
                              }
                              title="استعادة"
                              aria-label={`استعادة ${product.name}`}
                              className="text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                            >
                              <ArchiveRestore className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="border-border flex items-center justify-between gap-2 border-t p-3 sm:px-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-11 gap-1"
            >
              <ChevronRight className="size-4" />
              السابق
            </Button>
            <span className="text-muted-foreground text-sm tabular-nums">
              صفحة {currentPage} من {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-11 gap-1"
            >
              التالي
              <ChevronLeft className="size-4" />
            </Button>
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
            <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={() =>
                pendingArchive &&
                archiveMutation.mutate({
                  id: pendingArchive.id,
                  archived: false,
                })
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

function StockBadge({ product }: { product: Product }) {
  if (!product.isActive) {
    return (
      <span className="bg-surface-sunken text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-xs font-semibold">
        مؤرشف
      </span>
    );
  }
  if (product.stockQuantity > 0) {
    return (
      <span className="bg-success-soft text-success inline-flex rounded-full px-2 py-0.5 text-xs font-semibold">
        متوفر
      </span>
    );
  }
  return (
    <span className="bg-sale-soft text-sale inline-flex rounded-full px-2 py-0.5 text-xs font-semibold">
      غير متوفر
    </span>
  );
}

/**
 * Edit / archive on a phone.
 *
 * As two 24px icon buttons these were half the 44px touch minimum and sat
 * side by side. One 44px menu holds both with room to label them.
 */
function RowActions({
  product,
  onArchive,
  onRestore,
}: {
  product: Product;
  onArchive: () => void;
  onRestore: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`إجراءات ${product.name}`}
        className="text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 -me-1 flex size-11 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <MoreVertical className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem asChild>
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="cursor-pointer gap-2"
          >
            <FilePenLine className="size-4" />
            تعديل
          </Link>
        </DropdownMenuItem>
        {product.isActive ? (
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2"
            onClick={onArchive}
          >
            <Archive className="size-4" />
            أرشفة
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={onRestore}>
            <ArchiveRestore className="size-4" />
            استعادة
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
