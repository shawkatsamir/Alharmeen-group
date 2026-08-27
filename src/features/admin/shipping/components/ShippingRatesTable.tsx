"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Switch } from "@/shared/components/ui/Switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/Tabs";
import { formatCurrency } from "@/lib/utils";
import { getShippingSettings } from "../actions/get-shipping-settings";
import { updateGovernorate } from "../actions/shipping-settings";
import { LocalitiesTable } from "./LocalitiesTable";
import { DeliveryPricingPanel } from "./DeliveryPricingPanel";

export function ShippingRatesTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-shipping"],
    queryFn: getShippingSettings,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="pricing" dir="rtl" className="space-y-6">
      <TabsList>
        <TabsTrigger value="pricing">التسعير</TabsTrigger>
        <TabsTrigger value="localities">
          المدن ({data?.localities.length ?? 0})
        </TabsTrigger>
        <TabsTrigger value="governorates">المحافظات</TabsTrigger>
      </TabsList>

      <TabsContent value="pricing">
        {data && (
          <DeliveryPricingPanel
            tiers={data.tiers}
            rules={data.rules}
            settings={data.settings}
          />
        )}
      </TabsContent>

      <TabsContent value="localities">
        {data && (
          <LocalitiesTable
            localities={data.localities}
            maxDeliveryKm={data.settings.maxDeliveryKm}
          />
        )}
      </TabsContent>

      <TabsContent value="governorates">
        <GovernorateRates governorates={data?.governorates ?? []} />
      </TabsContent>
    </Tabs>
  );
}

/**
 * The pre-distance flat rates.
 *
 * Kept because they are the fallback when a locality has no coordinates and no
 * manual distance — deleting them would leave that case with no price at all.
 * Normal orders no longer use these numbers.
 */
function GovernorateRates({
  governorates,
}: {
  governorates: {
    id: number;
    name_ar: string;
    shipping_cost: number;
    is_deliverable: boolean;
    order_count: number;
    revenue: number;
  }[];
}) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const mutation = useMutation({
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
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });
    },
    onError: () => toast.error("تعذر حفظ التغيير"),
  });

  const maxOrders = Math.max(1, ...governorates.map((g) => g.order_count));

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Truck className="h-5 w-5 text-[#4EA674]" />
          سعر احتياطي لكل محافظة
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          يُستخدم فقط إذا كانت المدينة بلا إحداثيات وبلا مسافة يدوية. الطلبات
          العادية تُسعّر بالمسافة.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-right">
            <tr>
              <th className="p-4 font-medium">المحافظة</th>
              <th className="p-4 font-medium">الطلبات</th>
              <th className="p-4 font-medium">الإيرادات</th>
              <th className="p-4 font-medium">سعر احتياطي</th>
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
                      <span
                        className="h-1.5 rounded-full bg-[#4EA674]"
                        style={{
                          width: `${Math.round((governorate.order_count / maxOrders) * 80)}px`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="p-4 tabular-nums text-muted-foreground">
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
                        mutation.mutate({
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
                      disabled={!isDirty || mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
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
  );
}
