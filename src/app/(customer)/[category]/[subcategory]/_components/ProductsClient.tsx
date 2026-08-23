"use client";

import { useMemo, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ProductGrid } from "@/shared/components/ui/ProductGrid";
import { FilterSidebar } from "./FilterSidebar";
import { FilterOptions } from "@/services/server/products";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import type { Product } from "@/features/products/types";
import { collapseVariants } from "@/features/products/lib/variant-group";

interface ProductsClientProps {
  initialProducts: Product[];
  filterOptions: FilterOptions;
  subcategoryName: string;
}

type SortOption = "newest" | "price_asc" | "price_desc" | "best_seller";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "السعر: من الأقل للأعلى" },
  { value: "price_desc", label: "السعر: من الأعلى للأقل" },
  { value: "best_seller", label: "الأكثر مبيعاً" },
];

export default function ProductsClient({
  initialProducts,
  filterOptions,
}: ProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Read filter state from URL
  const selectedBrands = useMemo(() => {
    const brands = searchParams.get("brands");
    return brands ? brands.split(",") : [];
  }, [searchParams]);

  const priceRange = useMemo(() => {
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    return {
      min: min ? Number(min) : filterOptions.priceRange.min,
      max: max ? Number(max) : filterOptions.priceRange.max,
    };
  }, [searchParams, filterOptions.priceRange]);

  const offersOnly = searchParams.get("offers") === "true";
  const sortBy = (searchParams.get("sort") as SortOption) || "newest";

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === "") {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        });

        const queryString = params.toString();
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [searchParams, pathname, router],
  );

  // Filter handlers
  const handleBrandChange = useCallback(
    (brandId: string) => {
      const newBrands = selectedBrands.includes(brandId)
        ? selectedBrands.filter((b) => b !== brandId)
        : [...selectedBrands, brandId];

      updateParams({
        brands: newBrands.length > 0 ? newBrands.join(",") : null,
      });
    },
    [selectedBrands, updateParams],
  );

  const handlePriceChange = useCallback(
    (min: number, max: number) => {
      updateParams({
        minPrice: min !== filterOptions.priceRange.min ? min.toString() : null,
        maxPrice: max !== filterOptions.priceRange.max ? max.toString() : null,
      });
    },
    [filterOptions.priceRange, updateParams],
  );

  const handleOffersChange = useCallback(
    (value: boolean) => {
      updateParams({ offers: value ? "true" : null });
    },
    [updateParams],
  );

  const handleSortChange = useCallback(
    (value: SortOption) => {
      updateParams({ sort: value !== "newest" ? value : null });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [router, pathname]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBrands.length > 0) count++;
    if (
      priceRange.min !== filterOptions.priceRange.min ||
      priceRange.max !== filterOptions.priceRange.max
    )
      count++;
    if (offersOnly) count++;
    return count;
  }, [selectedBrands, priceRange, offersOnly, filterOptions.priceRange]);

  /*
   * Filter first, then group, then sort the GROUPS.
   *
   * Order matters twice over:
   *
   *  - Filtering must precede grouping. If the shopper asks for ٥٠٠٠–٨٠٠٠ ج.م
   *    and only the silver variant qualifies, silver is what the card must
   *    show; grouping first would pick a representative the filter excluded.
   *
   *  - Sorting must follow grouping. A card advertises its *representative's*
   *    price, so sorting the raw variants would place a group at its cheapest
   *    member's position while displaying a different, higher price — the grid
   *    would look mis-sorted.
   */
  const visibleGroups = useMemo(() => {
    let result = [...initialProducts];

    // Filter by brands
    if (selectedBrands.length > 0) {
      result = result.filter(
        (p) => p.brand && selectedBrands.includes(p.brand.id),
      );
    }

    // Filter by price range
    result = result.filter(
      (p) => p.price >= priceRange.min && p.price <= priceRange.max,
    );

    // Filter offers only
    if (offersOnly) {
      result = result.filter((p) => p.old_price && p.old_price > p.price);
    }

    const groups = collapseVariants(result);

    // Sort, always on the variant the card actually shows.
    switch (sortBy) {
      case "price_asc":
        groups.sort((a, b) => a.representative.price - b.representative.price);
        break;
      case "price_desc":
        groups.sort((a, b) => b.representative.price - a.representative.price);
        break;
      case "best_seller":
        groups.sort(
          (a, b) =>
            (b.representative.sales_count || 0) -
            (a.representative.sales_count || 0),
        );
        break;
      case "newest":
      default:
        groups.sort(
          (a, b) =>
            new Date(b.representative.created_at).getTime() -
            new Date(a.representative.created_at).getTime(),
        );
        break;
    }

    return groups;
  }, [initialProducts, selectedBrands, priceRange, offersOnly, sortBy]);

  /**
   * Flattened back to a product list for `ProductGrid`, which re-groups it.
   *
   * Members stay contiguous and groups stay in the order chosen above, and
   * `collapseVariants` surfaces each group at its first member's position — so
   * the grid reconstructs exactly this ordering, and the cards still receive
   * their siblings for the swatch row.
   */
  const orderedProducts = useMemo(
    () => visibleGroups.flatMap((group) => group.members),
    [visibleGroups],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filter Sidebar */}
      <FilterSidebar
        filterOptions={filterOptions}
        selectedBrands={selectedBrands}
        onBrandChange={handleBrandChange}
        priceRange={priceRange}
        onPriceChange={handlePriceChange}
        offersOnly={offersOnly}
        onOffersChange={handleOffersChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />

      {/* Products Grid */}
      <div className="flex-1">
        {/* Header with count and sort */}
        <div className="flex items-center justify-between mb-4 gap-4">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-sm font-medium">تصفية</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="text-sm text-gray-600 hidden sm:block">
            {/* Counts cards, not rows — a three-finish fridge is one product. */}
            <span className="font-medium text-gray-900">
              {visibleGroups.length}
            </span>{" "}
            منتج
            {activeFilterCount > 0 && (
              <span className="text-gray-400">
                {" "}
                (من {initialProducts.length})
              </span>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Loading overlay */}
        <div className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
          {visibleGroups.length > 0 ? (
            <ProductGrid products={orderedProducts} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">لا توجد منتجات مطابقة</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-primary hover:underline"
                >
                  مسح التصفية
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
