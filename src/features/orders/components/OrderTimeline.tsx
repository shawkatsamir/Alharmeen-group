import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
  id: string;
  label: string;
  date?: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
  icon: React.ElementType;
}

interface OrderTimelineProps {
  steps: TimelineStep[];
}

export function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-surface-sunken" />
      <div className="space-y-8 relative">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div key={step.id} className="flex gap-4">
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2",
                  isCompleted
                    ? "bg-green-100 border-green-500 text-green-600"
                    : isCurrent
                      ? "bg-blue-100 border-blue-500 text-blue-600"
                      : "bg-surface-sunken border-border text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4
                      className={cn(
                        "text-sm font-semibold",
                        isCompleted || isCurrent
                          ? "text-foreground dark:text-white"
                          : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </h4>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {step.date && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {step.date}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
