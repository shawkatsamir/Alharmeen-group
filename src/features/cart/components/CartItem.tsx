import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Trash2, Plus, Minus } from "lucide-react";
import { Img } from "@/shared/components/ui/Image";

interface CartItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    image: string;
    slug: string;
    brand: string;
    quantity: number;
  };
}

export function CartItem({ item }: CartItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="flex gap-4 py-4 border-b last:border-0 border-gray-100">
      <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100">
        <Img src={item.image} alt={item.name} fill className="object-cover" />
      </div>
      <div className="flex flex-col grow justify-between">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="font-semibold text-base md:text-lg line-clamp-2">
              {item.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{item.brand}</p>
          </div>
          <p className="font-bold whitespace-nowrap">
            {item.price.toLocaleString()} ج.م
          </p>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() =>
                updateQuantity(item.id, Math.max(1, item.quantity - 1))
              }
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">حذف</span>
          </Button>
        </div>
        {item.quantity > 1 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              الإجمالي: {(item.price * item.quantity).toLocaleString("ar-EG")}{" "}
              جنيه
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
