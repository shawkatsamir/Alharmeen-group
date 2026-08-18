import { RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HAPPY_PATH, STATUS_LABELS } from "../constants/order-status";
import { STATUS_ICONS } from "../constants/order-status-icons";

// The tracker shows the happy path only; terminal branches short-circuit below.
const STEPS = HAPPY_PATH.map((id) => ({ id, label: STATUS_LABELS[id] }));

export function OrderTracker({ currentStatus }: { currentStatus: string }) {
  if (currentStatus === "ملغي") {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
        <XCircle className="w-5 h-5" />
        <span className="font-semibold">تم إلغاء الطلب</span>
      </div>
    );
  }

  if (currentStatus === "مرتجع") {
    return (
      <div className="bg-amber-50 text-amber-700 p-4 rounded-lg flex items-center gap-2">
        <RotateCcw className="w-5 h-5" />
        <span className="font-semibold">تم إرجاع الطلب</span>
      </div>
    );
  }

  // An unrecognised status shows step 1 rather than a broken bar.
  const foundIndex = STEPS.findIndex((s) => s.id === currentStatus);
  const currentStepIndex = foundIndex === -1 ? 0 : foundIndex;

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
                  (() => {
                    // Icon comes from the status registry — hardcoded indices
                    // silently broke when a step was added to the path.
                    const Icon = STATUS_ICONS[step.id];
                    return <Icon className="w-4 h-4" />;
                  })()
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
