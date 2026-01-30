"use client";

import { memo, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FilterOptions } from "@/services/server/products";
import { Slider } from "@/shared/components/ui/Slider";

// Add isOpen and onClose to props
interface FilterSidebarProps {
  filterOptions: FilterOptions;
  selectedBrands: string[];
  onBrandChange: (brandId: string) => void;
  priceRange: { min: number; max: number };
  onPriceChange: (min: number, max: number) => void;
  offersOnly: boolean;
  onOffersChange: (value: boolean) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  isOpen?: boolean;
  onClose?: () => void;
}

function FilterSidebarComponent({
  filterOptions,
  selectedBrands,
  onBrandChange,
  priceRange,
  onPriceChange,
  offersOnly,
  onOffersChange,
  onClearFilters,
  activeFilterCount,
  isOpen = false,
  onClose,
}: FilterSidebarProps) {
  const { brands, priceRange: availablePriceRange, hasOffers } = filterOptions;

  // Local state for price range to avoid URL updates while dragging
  const [localPrice, setLocalPrice] = useState([
    priceRange.min,
    priceRange.max,
  ]);

  // Sync local state with props (e.g. when cleared or URL changes externally)
  useEffect(() => {
    setLocalPrice([priceRange.min, priceRange.max]);
  }, [priceRange.min, priceRange.max]);

  // Handle slider change (dragging)
  const handleSliderChange = (value: number[]) => {
    setLocalPrice(value);
  };

  // Handle slider commit (drag end)
  const handleSliderCommit = (value: number[]) => {
    onPriceChange(value[0], value[1]);
  };

  // Handle input change
  const handleInputChange = (index: 0 | 1, value: string) => {
    const newVal = Number(value);
    const newRange = [...localPrice];
    newRange[index] = newVal;
    setLocalPrice(newRange);
  };

  // Handle input blur/enter to commit
  const handleInputCommit = () => {
    // Ensure values are within bounds and min <= max
    let [min, max] = localPrice;
    if (min < availablePriceRange.min) min = availablePriceRange.min;
    if (max > availablePriceRange.max) max = availablePriceRange.max;
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    onPriceChange(min, max);
    // Local state will be updated via useEffect when prop changes
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          w-full lg:w-64 shrink-0 
          fixed lg:static inset-y-0 right-0 z-50 
          bg-white lg:bg-transparent 
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          lg:block
          overflow-y-auto lg:overflow-visible
        `}
      >
        <div className="bg-white lg:rounded-lg lg:border lg:border-gray-200 p-4 sticky top-0 lg:top-4 h-full lg:h-auto min-h-screen lg:min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">تصفية النتائج</h3>
            <div className="flex items-center gap-4">
              {activeFilterCount > 0 && (
                <button
                  onClick={onClearFilters}
                  className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  مسح ({activeFilterCount})
                </button>
              )}
              {/* Mobile Close Button */}
              <button onClick={onClose} className="lg:hidden text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Brands Filter */}
          {brands.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">الماركة</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {brands.map((brand) => (
                  <label
                    key={brand.id}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.id)}
                      onChange={() => onBrandChange(brand.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">
                      {brand.name_ar}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({brand.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          {availablePriceRange.max > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">نطاق السعر</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">
                      من
                    </label>
                    <input
                      type="number"
                      value={localPrice[0]}
                      onChange={(e) => handleInputChange(0, e.target.value)}
                      onBlur={handleInputCommit}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleInputCommit()
                      }
                      min={availablePriceRange.min}
                      max={availablePriceRange.max}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">
                      إلى
                    </label>
                    <input
                      type="number"
                      value={localPrice[1]}
                      onChange={(e) => handleInputChange(1, e.target.value)}
                      onBlur={handleInputCommit}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleInputCommit()
                      }
                      min={availablePriceRange.min}
                      max={availablePriceRange.max}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <Slider
                  min={availablePriceRange.min}
                  max={availablePriceRange.max}
                  step={10}
                  value={localPrice}
                  onValueChange={handleSliderChange}
                  onValueCommit={handleSliderCommit}
                  className="py-2"
                />

                <div className="text-xs text-gray-400 text-center">
                  {availablePriceRange.min.toLocaleString()} -{" "}
                  {availablePriceRange.max.toLocaleString()} ج.م
                </div>
              </div>
            </div>
          )}

          {/* Offers Only Filter */}
          {hasOffers && (
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offersOnly}
                  onChange={(e) => onOffersChange(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">العروض فقط</span>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  خصم
                </span>
              </label>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export const FilterSidebar = memo(FilterSidebarComponent);
