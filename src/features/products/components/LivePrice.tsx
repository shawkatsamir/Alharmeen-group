"use client";

import { useRealtimePrice } from "../hooks/useRealtimePrice";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Props {
  product: {
    id: string;
    price: number;
    stock_quantity: number;
  };
}

export function LivePrice({ product }: Props) {
  const { data, isFetching } = useRealtimePrice(product);

  // Fallback to initial product if data is undefined
  const currentPrice = data?.price ?? product.price;
  const stock = data?.stock_quantity ?? product.stock_quantity;
  const isOutOfStock = stock <= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <h2 className="text-3xl font-bold text-gray-900">
          {currentPrice.toLocaleString()} EGP
        </h2>

        {/* Subtle Loading Indicator for the admin/dev to know it's checking */}
        {isFetching && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin mb-1.5" />
        )}
      </div>

      {/* Stock Status */}
      {isOutOfStock ? (
        <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
          Out of Stock
        </span>
      ) : stock < 5 ? (
        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
          Only {stock} left!
        </span>
      ) : (
        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
          In Stock
        </span>
      )}
    </div>
  );
}
