"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, MapPin } from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Switch } from "@/shared/components/ui/Switch";
import { DebouncedSearchInput } from "@/features/search/components/DebouncedSearchInput";
import { cn } from "@/lib/utils";
import type { LocalityWithTraffic } from "../actions/get-shipping-settings";
import { updateLocality } from "../actions/shipping-settings";

interface LocalitiesTableProps {
  localities: LocalityWithTraffic[];
  maxDeliveryKm: number;
}

/**
 * The coordinate audit.
 *
 * Seeded coordinates are approximate locality centres, and a wrong one
 * mis-prices silently — there is no error to catch. Sorting by distance
 * descending makes an implausible value obvious at a glance, which is the only
 * practical way to check ~97 rows.
 */
export function LocalitiesTable({
  localities,
  maxDeliveryKm,
}: LocalitiesTableProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const mutation = useMutation({
    mutationFn: (vars: {
      id: number;
      distance_km_override: number | null;
      is_deliverable: boolean;
      coordinates_verified: boolean;
    }) => updateLocality(vars.id, vars),
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

  const term = search.trim();
  const rows = term
    ? localities.filter(
        (l) => l.name_ar.includes(term) || l.governorate_name.includes(term),
      )
    : localities;

  const unverified = localities.filter(
    (l) => !l.coordinates_verified && l.straight_km !== null,
  ).length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="space-y-3 border-b border-border p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MapPin className="h-5 w-5 text-[#4EA674]" />
          المدن والمراكز ({localities.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          مرتبة بالأبعد أولاً. راجع المسافات — الإحداثيات التقريبية قد تعطي رقماً
          غير منطقي، وعندها استخدم خانة &quot;مسافة يدوية&quot; لتجاوزها.
        </p>

        {unverified > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {unverified} مدينة لم تُراجع إحداثياتها بعد. علّم &quot;تمت
              المراجعة&quot; بعد التأكد من المسافة.
            </span>
          </div>
        )}

        <DebouncedSearchInput
          onSearch={setSearch}
          placeholder="ابحث باسم المدينة أو المحافظة..."
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-right">
            <tr>
              <th className="p-4 font-medium">المدينة</th>
              <th className="p-4 font-medium">المحافظة</th>
              <th className="p-4 font-medium">الطلبات</th>
              <th className="p-4 font-medium">خط مستقيم</th>
              <th className="p-4 font-medium">المسافة المستخدمة</th>
              <th className="p-4 font-medium">مسافة يدوية</th>
              <th className="p-4 font-medium">متاح</th>
              <th className="p-4 font-medium">تمت المراجعة</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((locality) => {
              const draft = drafts[locality.id];
              const currentOverride =
                locality.distance_km_override === null
                  ? ""
                  : String(locality.distance_km_override);
              const isDirty = draft !== undefined && draft !== currentOverride;
              const outOfRange =
                locality.effective_km !== null &&
                locality.effective_km > maxDeliveryKm;

              const save = (
                patch: Partial<{
                  is_deliverable: boolean;
                  coordinates_verified: boolean;
                }> = {},
              ) =>
                mutation.mutate({
                  id: locality.id,
                  distance_km_override:
                    draft === undefined
                      ? locality.distance_km_override
                      : draft.trim() === ""
                        ? null
                        : Number(draft),
                  is_deliverable: locality.is_deliverable,
                  coordinates_verified: locality.coordinates_verified,
                  ...patch,
                });

              return (
                <tr key={locality.id} className="hover:bg-muted/30">
                  <td className="p-4 font-medium">{locality.name_ar}</td>
                  <td className="p-4 text-muted-foreground">
                    {locality.governorate_name}
                  </td>
                  <td className="p-4 tabular-nums">
                    {locality.order_count > 0 ? locality.order_count : "—"}
                  </td>
                  <td className="p-4 tabular-nums text-muted-foreground">
                    {locality.straight_km ?? "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        outOfRange && "text-amber-600",
                      )}
                    >
                      {locality.effective_km ?? "—"}
                      {locality.effective_km !== null && " كم"}
                    </span>
                    {outOfRange && (
                      <span className="block text-xs text-amber-600">
                        خارج النطاق
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      placeholder="—"
                      className="max-w-[110px]"
                      value={draft ?? currentOverride}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [locality.id]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="p-4">
                    <Switch
                      checked={locality.is_deliverable}
                      onCheckedChange={(checked) =>
                        save({ is_deliverable: checked })
                      }
                    />
                  </td>
                  <td className="p-4">
                    <Switch
                      checked={locality.coordinates_verified}
                      onCheckedChange={(checked) =>
                        save({ coordinates_verified: checked })
                      }
                    />
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isDirty || mutation.isPending}
                      onClick={() => save()}
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
