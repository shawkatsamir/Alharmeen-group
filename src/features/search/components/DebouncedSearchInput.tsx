"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

export function DebouncedSearchInput({
  onSearch,
  placeholder = "بحث...",
  className = "",
}: {
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebounce(term, 500);

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (debouncedTerm.length >= 3) {
      onSearchRef.current(debouncedTerm);
    } else {
      onSearchRef.current("");
    }
  }, [debouncedTerm]);

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className={`pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4EA674] focus:border-transparent transition-all text-right ${className}`}
      />
    </div>
  );
}
