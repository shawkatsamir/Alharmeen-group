"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { formatCurrency } from "@/lib/utils";
import type {
  DeliverySettings,
  FreeShippingRuleRow,
} from "../actions/get-shipping-settings";
import type { DeliveryTier } from "@/features/checkout/lib/shipping";
import {
  deleteFreeShippingRule,
  saveFreeShippingRule,
  updateDeliverySettings,
  updateDeliveryTier,
} from "../actions/shipping-settings";

interface Props {
  tiers: DeliveryTier[];
  rules: FreeShippingRuleRow[];
  settings: DeliverySettings;
}

export function DeliveryPricingPanel({ tiers, rules, settings }: Props) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });

  const toastResult = (result: { success: boolean; message: string }) => {
    if (result.success) {
      toast.success(result.message);
      invalidate();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <OriginCard settings={settings} onDone={toastResult} />
      <TiersCard tiers={tiers} onDone={toastResult} />
      <RulesCard rules={rules} onDone={toastResult} />
    </div>
  );
}

type Done = (result: { success: boolean; message: string }) => void;

function OriginCard({
  settings,
  onDone,
}: {
  settings: DeliverySettings;
  onDone: Done;
}) {
  const [form, setForm] = useState({
    originName: settings.originName,
    originLat: String(settings.originLat ?? ""),
    originLng: String(settings.originLng ?? ""),
    roadFactor: String(settings.roadFactor),
    maxDeliveryKm: String(settings.maxDeliveryKm),
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateDeliverySettings({
        originName: form.originName.trim(),
        originLat: Number(form.originLat),
        originLng: Number(form.originLng),
        roadFactor: Number(form.roadFactor),
        maxDeliveryKm: Number(form.maxDeliveryKm),
      }),
    onSuccess: onDone,
    onError: () => toast.error("تعذر حفظ الإعدادات"),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">موقع المتجر ونطاق التوصيل</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        كل المسافات تُحسب من هذا الموقع. تغييره يعيد حساب مسافات كل المدن
        تلقائياً.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="origin-name">اسم الموقع</Label>
          <Input id="origin-name" {...field("originName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="origin-lat">خط العرض</Label>
          <Input id="origin-lat" type="number" step="0.0001" {...field("originLat")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="origin-lng">خط الطول</Label>
          <Input id="origin-lng" type="number" step="0.0001" {...field("originLng")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="road-factor">معامل الطريق</Label>
          <Input id="road-factor" type="number" step="0.05" min={1} {...field("roadFactor")} />
          <p className="text-xs text-muted-foreground">
            نسبة مسافة الطريق للمسافة المستقيمة. الدلتا عادة 1.25–1.35.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-km">أقصى مسافة توصيل (كم)</Label>
          <Input id="max-km" type="number" min={1} {...field("maxDeliveryKm")} />
          <p className="text-xs text-muted-foreground">
            بعدها لا يُعرض سعر ويُطلب من العميل التواصل.
          </p>
        </div>
      </div>

      <Button
        className="mt-4"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "جاري الحفظ..." : "حفظ وإعادة حساب المسافات"}
      </Button>
    </div>
  );
}

function TiersCard({ tiers, onDone }: { tiers: DeliveryTier[]; onDone: Done }) {
  const [drafts, setDrafts] = useState<
    Record<string, Record<string, string>>
  >({});

  const mutation = useMutation({
    mutationFn: (vars: {
      key: string;
      values: {
        base_fee: number;
        per_km_rate: number;
        min_fee: number;
        max_fee: number;
      };
    }) => updateDeliveryTier(vars.key, vars.values),
    onSuccess: onDone,
    onError: () => toast.error("تعذر حفظ الفئة"),
  });

  const FIELDS = [
    { key: "base_fee", label: "رسم ثابت" },
    { key: "per_km_rate", label: "لكل كم" },
    { key: "min_fee", label: "أقل سعر" },
    { key: "max_fee", label: "أعلى سعر" },
  ] as const;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">فئات التوصيل</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        السعر = رسم ثابت + (المسافة × سعر الكيلومتر). الرسم الثابت يغطي التحميل
        والمشوار نفسه، لذلك لا يبدأ السعر من صفر للمشوار القريب.
      </p>

      <div className="space-y-4">
        {tiers.map((tier) => {
          const draft = drafts[tier.key] ?? {};
          const read = (k: string) =>
            draft[k] ?? String(tier[k as keyof DeliveryTier]);
          const isDirty = FIELDS.some(
            (f) => draft[f.key] !== undefined && read(f.key) !== String(tier[f.key]),
          );

          return (
            <div
              key={tier.key}
              className="rounded-md border border-border p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium">{tier.label_ar}</span>
                <span className="text-xs text-muted-foreground">
                  مثال 35 كم:{" "}
                  {formatCurrency(
                    Math.min(
                      Number(read("max_fee")),
                      Math.max(
                        Number(read("min_fee")),
                        Number(read("base_fee")) + 35 * Number(read("per_km_rate")),
                      ),
                    ),
                  )}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={read(f.key)}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [tier.key]: {
                            ...prev[tier.key],
                            [f.key]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={!isDirty || mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    key: tier.key,
                    values: {
                      base_fee: Number(read("base_fee")),
                      per_km_rate: Number(read("per_km_rate")),
                      min_fee: Number(read("min_fee")),
                      max_fee: Number(read("max_fee")),
                    },
                  })
                }
              >
                حفظ
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RulesCard({
  rules,
  onDone,
}: {
  rules: FreeShippingRuleRow[];
  onDone: Done;
}) {
  const [newRule, setNewRule] = useState({ distance: "", total: "" });

  const save = useMutation({
    mutationFn: (vars: { max_distance_km: number; min_order_total: number }) =>
      saveFreeShippingRule(vars),
    onSuccess: (result) => {
      if (result.success) setNewRule({ distance: "", total: "" });
      onDone(result);
    },
    onError: () => toast.error("تعذر حفظ القاعدة"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteFreeShippingRule(id),
    onSuccess: onDone,
    onError: () => toast.error("تعذر حذف القاعدة"),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">الشحن المجاني</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        يُطبق حسب أقرب نطاق يغطي المشوار. بدون قواعد، لا يوجد شحن مجاني — وهذا
        مقصود حتى تحدد أنت الهامش الذي يتحمله.
      </p>

      {rules.length > 0 && (
        <ul className="mb-4 divide-y divide-border">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                حتى {rule.max_distance_km} كم — للطلبات من{" "}
                {formatCurrency(rule.min_order_total)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-600"
                disabled={remove.isPending}
                onClick={() => remove.mutate(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">حتى مسافة (كم)</Label>
          <Input
            type="number"
            min={1}
            className="max-w-[140px]"
            value={newRule.distance}
            onChange={(e) =>
              setNewRule((p) => ({ ...p, distance: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">أقل إجمالي للطلب</Label>
          <Input
            type="number"
            min={1}
            className="max-w-[180px]"
            value={newRule.total}
            onChange={(e) => setNewRule((p) => ({ ...p, total: e.target.value }))}
          />
        </div>
        <Button
          variant="outline"
          disabled={!newRule.distance || !newRule.total || save.isPending}
          onClick={() =>
            save.mutate({
              max_distance_km: Number(newRule.distance),
              min_order_total: Number(newRule.total),
            })
          }
        >
          <Plus className="ml-1 h-4 w-4" />
          إضافة قاعدة
        </Button>
      </div>
    </div>
  );
}
