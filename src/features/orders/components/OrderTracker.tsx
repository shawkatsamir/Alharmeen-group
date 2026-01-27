import {
  ChevronsRight,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 1. Define the steps sequence
const STEPS = [
  { id: "قيد الانتظار", label: "تم الطلب" },
  { id: "جاري التجهيز", label: "جاري التجهيز" },
  { id: "تم الشحن", label: "تم الشحن" },
  { id: "تم التوصيل", label: "تم التوصيل" },
];

export function OrderTracker({ currentStatus }: { currentStatus: string }) {
  const getCurrentStepIndex = () => {
    if (currentStatus === "mlghy" || currentStatus === "ملغي") return -1;

    // Find index of current status
    const index = STEPS.findIndex((s) => s.id === currentStatus);
    return index === -1 ? 0 : index;
  };

  const currentStepIndex = getCurrentStepIndex();

  if (currentStatus === "mlghy" || currentStatus === "ملغي") {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
        <XCircle className="w-5 h-5" />
        <span className="font-semibold">تم إلغاء الطلب</span>
      </div>
    );
  }

  return (
    <div className="w-full py-6" dir="rtl">
      <div className="relative flex items-center justify-between">
        {/* Background Grey Line */}
        <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10" />

        {/* Active Green Line (Calculated Width) */}
        {/* Note: In RTL, right:0 is the start. We animate width to the left. */}
        <div
          className="absolute right-0 top-1/2 h-1 bg-[#4EA674] -z-10 transition-all duration-500"
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps Bubbles */}
        {STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center bg-white px-2"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  isCompleted
                    ? "bg-[#4EA674] border-[#4EA674] text-white"
                    : "bg-white border-gray-300 text-gray-300",
                )}
              >
                {isCompleted ? (
                  index === 3 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : index === 2 ? (
                    <Truck className="w-4 h-4" />
                  ) : index === 1 ? (
                    <Package className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium",
                  isCompleted ? "text-[#4EA674]" : "text-gray-500",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
