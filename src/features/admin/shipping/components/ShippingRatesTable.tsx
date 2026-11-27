"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
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
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="pricing" dir="rtl" className="space-y-4 lg:space-y-6">
      {/* Full width on a phone so three tabs never crowd into a corner. */}
      <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:w-auto">
        <TabsTrigger value="pricing" className="min-h-11">
          التسعير
        </TabsTrigger>
        <TabsTrigger value="localities" className="min-h-11">
          المدن ({data?.localities.length ?? 0})
        </TabsTrigger>
        <TabsTrigger value="governorates" className="min-h-11">
          المحافظات
        </TabsTrigger>
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

interface GovernorateRow {
  id: number;
  name_ar: string;
  shipping_cost: number;
  is_deliverable: boolean;
  order_count: number;
  revenue: number;
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
  governorates: GovernorateRow[];
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

  const isDirty = (g: GovernorateRow) => {
    const draft = drafts[g.id];
    return draft !== undefined && Number(draft) !== g.shipping_cost;
  };

  const save = (g: GovernorateRow) =>
    mutation.mutate({
      id: g.id,
      shipping_cost: Number(drafts[g.id]),
      is_deliverable: g.is_deliverable,
    });

  const setDraft = (id: number, value: string) =>
    setDrafts((prev) => ({ ...prev, [id]: value }));

  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="border-border border-b p-4 lg:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Truck className="text-primary size-5" />
          سعر احتياطي لكل محافظة
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          يُستخدم فقط إذا كانت المدينة بلا إحداثيات وبلا مسافة يدوية. الطلبات
          العادية تُسعّر بالمسافة.
        </p>
      </div>

      {/* Phone: one card per governorate. */}
      <ul className="divide-border divide-y lg:hidden">
        {governorates.map((governorate) => (
          <li key={governorate.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-foreground font-medium">
                  {governorate.name_ar}
                </p>
                <p className="text-muted-foreground mt-0.5 text-sm tabular-nums">
                  {governorate.order_count} طلب
                  {governorate.revenue > 0 &&
                    ` · ${formatCurrency(governorate.revenue)}`}
                </p>
              </div>
              <label
                htmlFor={`gov-deliverable-${governorate.id}`}
                className="text-muted-foreground flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-xs"
              >
                التوصيل
                <Switch
                  id={`gov-deliverable-${governorate.id}`}
                  checked={governorate.is_deliverable}
                  onCheckedChange={(checked) =>
                    mutation.mutate({
                      id: governorate.id,
                      shipping_cost: governorate.shipping_cost,
                      is_deliverable: checked,
                    })
                  }
                />
              </label>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={`gov-cost-${governorate.id}`}
                  className="text-xs"
                >
                  سعر احتياطي
                </Label>
                <Input
                  id={`gov-cost-${governorate.id}`}
                  type="number"
                  min={0}
                  className="h-11"
                  value={drafts[governorate.id] ?? governorate.shipping_cost}
                  onChange={(e) => setDraft(governorate.id, e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="h-11"
                disabled={!isDirty(governorate) || mutation.isPending}
                onClick={() => save(governorate)}
              >
                حفظ
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: the full table. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken text-right">
            <tr>
              <th className="p-4 font-medium">المحافظة</th>
              <th className="p-4 font-medium">الطلبات</th>
              <th className="p-4 font-medium">الإيرادات</th>
              <th className="p-4 font-medium">سعر احتياطي</th>
              <th className="p-4 font-medium">التوصيل متاح</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {governorates.map((governorate) => (
              <tr key={governorate.id} className="hover:bg-primary-soft/40">
                <td className="p-4 font-medium">{governorate.name_ar}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 tabular-nums">
                      {governorate.order_count}
                    </span>
                    <span
                      className="bg-primary h-1.5 rounded-full"
                      style={{
                        width: `${Math.round((governorate.order_count / maxOrders) * 80)}px`,
                      }}
                    />
                  </div>
                </td>
                <td className="text-muted-foreground p-4 tabular-nums">
                  {governorate.revenue > 0
                    ? formatCurrency(governorate.revenue)
                    : "—"}
                </td>
                <td className="p-4">
                  <Input
                    type="number"
                    min={0}
                    className="max-w-[120px]"
                    aria-label={`سعر احتياطي لـ ${governorate.name_ar}`}
                    value={drafts[governorate.id] ?? governorate.shipping_cost}
                    onChange={(e) => setDraft(governorate.id, e.target.value)}
                  />
                </td>
                <td className="p-4">
                  <Switch
                    aria-label={`التوصيل متاح: ${governorate.name_ar}`}
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
                    disabled={!isDirty(governorate) || mutation.isPending}
                    onClick={() => save(governorate)}
                  >
                    حفظ
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
