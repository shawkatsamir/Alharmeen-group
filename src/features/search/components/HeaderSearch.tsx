"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { Button } from "@/shared/components/ui/Button";

interface HeaderSearchProps {
  isMobileToggle?: boolean;
}

export function HeaderSearch({ isMobileToggle = false }: HeaderSearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Mobile toggle button only
  if (isMobileToggle) {
    return (
      <>
        {/* Mobile Search Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Mobile Search Overlay */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-100 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsSearchOpen(false)}
            />

            {/* Search Container */}
            <div className="absolute top-0 left-0 right-0 bg-white p-4 shadow-lg animate-in slide-in-from-top duration-200">
              <SearchBar isMobile onClose={() => setIsSearchOpen(false)} />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop inline search
  return (
    <div className="w-full">
      <SearchBar />
    </div>
  );
}
