import { RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HAPPY_PATH, STATUS_LABELS } from "../constants/order-status";
import { STATUS_ICONS } from "../constants/order-status-icons";

// The tracker shows the happy path only; terminal branches short-circuit below.
const STEPS = HAPPY_PATH.map((id) => ({ id, label: STATUS_LABELS[id] }));

export function OrderTracker({ currentStatus }: { currentStatus: string }) {
  if (currentStatus === "ملغي") {
    return (
      <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border p-4">
        <XCircle className="size-5 shrink-0" />
        <span className="font-semibold">تم إلغاء الطلب</span>
      </div>
    );
  }

  if (currentStatus === "مرتجع") {
    return (
      <div className="border-accent/40 bg-accent-soft text-accent-foreground flex items-center gap-2 rounded-lg border p-4">
        <RotateCcw className="size-5 shrink-0" />
        <span className="font-semibold">تم إرجاع الطلب</span>
      </div>
    );
  }

  // An unrecognised status shows step 1 rather than a broken bar.
  const foundIndex = STEPS.findIndex((s) => s.id === currentStatus);
  const currentStepIndex = foundIndex === -1 ? 0 : foundIndex;
  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="w-full py-4 sm:py-6" dir="rtl">
      <div className="relative flex items-center justify-between">
        <div className="bg-surface-sunken absolute start-0 top-1/2 -z-10 h-1 w-full" />

        {/*
         * The completed run. `start-0` rather than `right-0`: the container
         * is RTL, so the bar grows from the inline start.
         */}
        <div
          className="bg-primary absolute start-0 top-1/2 -z-10 h-1 transition-all duration-500"
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;

          return (
            <div
              key={step.id}
              className="bg-card flex flex-col items-center px-1 sm:px-2"
            >
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-colors duration-300",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  (() => {
                    // Icon comes from the status registry — hardcoded indices
                    // silently broke when a step was added to the path.
                    const Icon = STATUS_ICONS[step.id];
                    return <Icon className="size-4" />;
                  })()
                ) : (
                  <span className="text-xs tabular-nums">{index + 1}</span>
                )}
              </div>
              {/*
               * Five two-word Arabic labels across a 350px phone give each
               * about 70px, so they collided. The bubbles alone carry the
               * progress there and the step is named once, below.
               */}
              <span
                className={cn(
                  "mt-2 hidden text-xs font-medium sm:block",
                  isCompleted ? "text-primary" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-3 text-center text-xs sm:hidden">
        الخطوة {currentStepIndex + 1} من {STEPS.length} —{" "}
        <span className="text-primary font-medium">{currentStep.label}</span>
      </p>
    </div>
  );
}
