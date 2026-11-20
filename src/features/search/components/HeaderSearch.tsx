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
          aria-label="بحث"
          onClick={() => setIsSearchOpen(true)}
        >
          <Search className="size-5" />
        </Button>

        {/* Mobile Search Overlay */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-100 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
              onClick={() => setIsSearchOpen(false)}
            />

            {/* Search Container */}
            <div className="absolute top-0 left-0 right-0 bg-surface-raised p-4 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-top motion-safe:duration-200">
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
