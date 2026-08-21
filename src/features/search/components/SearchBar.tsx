"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, X } from "lucide-react";
import { useDebounce } from "@/features/search/hooks/useDebounce";
import { searchProducts } from "@/features/search/actions/search-products";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface SearchBarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function SearchBar({ onClose, isMobile = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Debounce the input (Wait 300ms)
  const debouncedQuery = useDebounce(query, 300);

  // 2. React Query handles Fetching, Caching, and Race Conditions
  const {
    data: results = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["search-products", debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    enabled: debouncedQuery.length > 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Focus input on mobile when opened
  useEffect(() => {
    if (isMobile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobile]);

  // Open dropdown when we have results or are loading
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery, results]);

  // Handle clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      onClose?.();
    }
  };

  const handleResultClick = () => {
    setIsOpen(false);
    onClose?.();
  };

  const showLoading = isLoading && debouncedQuery.length > 2;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن المنتجات..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-gray-50 text-right transition-all"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        <button
          type="submit"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
        >
          {showLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </form>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border overflow-hidden z-50">
          {/* Loading State */}
          {isFetching && results.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              جاري البحث...
            </div>
          )}

          {/* No Results */}
          {!isFetching && results.length === 0 && debouncedQuery.length > 2 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              لا توجد نتائج لـ &quot;{query}&quot;
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto">
              {results.map(
                (product: {
                  id: string;
                  slug: string;
                  name_ar: string;
                  name_en: string | null;
                  price: number;
                }) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    onClick={handleResultClick}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b last:border-0"
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {product.name_ar || product.name_en}
                      </p>
                    </div>
                  </Link>
                ),
              )}

              {/* See All Button */}
              <button
                onClick={handleSearchSubmit}
                className="w-full p-3 text-center text-sm text-primary font-bold hover:bg-blue-50 transition-colors bg-gray-50"
              >
                عرض كل النتائج ({results.length}+)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
