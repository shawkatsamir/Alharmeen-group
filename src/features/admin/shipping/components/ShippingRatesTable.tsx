"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Switch } from "@/shared/components/ui/Switch";
import { formatCurrency } from "@/lib/utils";
import { getShippingSettings } from "../actions/get-shipping-settings";
import {
  updateFreeShippingThreshold,
  updateGovernorate,
} from "../actions/shipping-settings";

export function ShippingRatesTable() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [thresholdDraft, setThresholdDraft] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-shipping"],
    queryFn: getShippingSettings,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });

  const rateMutation = useMutation({
    mutationFn: (vars: {
      id: number;
      shipping_cost: number;
      is_deliverable: boolean;
    }) =>
      updateGovernorate(vars.id, {
        shipping_cost: vars.shipping_cost,
        is_deliverable: vars.is_deliverable,
      }),
    onSuccess: (result, vars) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      // Drop the local draft so the row falls back to the server value.
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      invalidate();
    },
    onError: () => toast.error("تعذر حفظ التغيير"),
  });

  const thresholdMutation = useMutation({
    mutationFn: (value: number | null) => updateFreeShippingThreshold(value),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setThresholdDraft(null);
      invalidate();
    },
    onError: () => toast.error("تعذر حفظ الحد"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const governorates = data?.governorates ?? [];
  const maxOrders = Math.max(1, ...governorates.map((g) => g.order_count));

  return (
    <div className="space-y-6">
      {/* Free shipping threshold */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-lg font-semibold">الشحن المجاني</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          الطلبات التي يزيد مجموعها عن هذا المبلغ يكون شحنها مجاني. اتركه فارغاً
          لإيقاف العرض.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="number"
            min={0}
            className="max-w-[200px]"
            placeholder="بدون حد"
            value={thresholdDraft ?? (data?.freeShippingThreshold ?? "")}
            onChange={(e) => setThresholdDraft(e.target.value)}
          />
          <Button
            disabled={thresholdMutation.isPending || thresholdDraft === null}
            onClick={() => {
              const raw = (thresholdDraft ?? "").trim();
              thresholdMutation.mutate(raw === "" ? null : Number(raw));
            }}
          >
            {thresholdMutation.isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>

      {/* Rates */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Truck className="h-5 w-5 text-[#4EA674]" />
            تكلفة الشحن لكل محافظة
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            عمود الطلبات يوضح مصدر الطلبات الفعلية — استخدمه لتحديد السعر
            المناسب.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-right">
              <tr>
                <th className="p-4 font-medium">المحافظة</th>
                <th className="p-4 font-medium">الطلبات</th>
                <th className="p-4 font-medium">الإيرادات</th>
                <th className="p-4 font-medium">تكلفة الشحن</th>
                <th className="p-4 font-medium">التوصيل متاح</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {governorates.map((governorate) => {
                const draft = drafts[governorate.id];
                const isDirty =
                  draft !== undefined &&
                  Number(draft) !== governorate.shipping_cost;

                return (
                  <tr key={governorate.id} className="hover:bg-muted/30">
                    <td className="p-4 font-medium">{governorate.name_ar}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 tabular-nums">
                          {governorate.order_count}
                        </span>
                        {/* Inline bar makes the traffic concentration obvious
                            at a glance without a chart library. */}
                        <span
                          className="h-1.5 rounded-full bg-[#4EA674]"
                          style={{
                            width: `${Math.round((governorate.order_count / maxOrders) * 80)}px`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground tabular-nums">
                      {governorate.revenue > 0
                        ? formatCurrency(governorate.revenue)
                        : "—"}
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        min={0}
                        className="max-w-[120px]"
                        value={draft ?? governorate.shipping_cost}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [governorate.id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="p-4">
                      <Switch
                        checked={governorate.is_deliverable}
                        onCheckedChange={(checked) =>
                          rateMutation.mutate({
                            id: governorate.id,
                            shipping_cost: governorate.shipping_cost,
                            is_deliverable: checked,
                          })
                        }
                      />
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isDirty || rateMutation.isPending}
                        onClick={() =>
                          rateMutation.mutate({
                            id: governorate.id,
                            shipping_cost: Number(draft),
                            is_deliverable: governorate.is_deliverable,
                          })
                        }
                      >
                        حفظ
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
