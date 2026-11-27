"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { Switch } from "@/shared/components/ui/Switch";
import { DebouncedSearchInput } from "@/features/search/components/DebouncedSearchInput";
import { cn } from "@/lib/utils";
import type { LocalityWithTraffic } from "../actions/get-shipping-settings";
import { updateLocality } from "../actions/shipping-settings";
import { googleMapsUrl, parseLatLng } from "@/features/checkout/lib/shipping";

interface LocalitiesTableProps {
  localities: LocalityWithTraffic[];
  maxDeliveryKm: number;
}

interface SavePatch {
  is_deliverable?: boolean;
  coordinates_verified?: boolean;
}

/**
 * The coordinate audit.
 *
 * Seeded coordinates are approximate locality centres, and a wrong one
 * mis-prices silently — there is no error to catch. Sorting by distance
 * descending makes an implausible value obvious at a glance, which is the only
 * practical way to check ~97 rows.
 *
 * On a phone that scan is the thing to protect. Ten columns of inline editing
 * could not fit, so the row collapses to the four facts the audit reads —
 * city, governorate, distance used, whether it is in range — and the seven
 * editable fields open on demand. The admin corrects a handful of rows and
 * scans all of them.
 */
export function LocalitiesTable({
  localities,
  maxDeliveryKm,
}: LocalitiesTableProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [coordDrafts, setCoordDrafts] = useState<Record<number, string>>({});

  const mutation = useMutation({
    mutationFn: (vars: {
      id: number;
      distance_km_override: number | null;
      is_deliverable: boolean;
      coordinates_verified: boolean;
      coordinates?: { lat: number; lng: number };
    }) => updateLocality(vars.id, vars),
    onSuccess: (result, vars) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      const clear = (prev: Record<number, string>) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      };
      setDrafts(clear);
      setCoordDrafts(clear);
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

  /** Everything a row needs to render and save, derived in one place. */
  const rowState = (locality: LocalityWithTraffic) => {
    const draft = drafts[locality.id];
    const currentOverride =
      locality.distance_km_override === null
        ? ""
        : String(locality.distance_km_override);
    const overrideDirty = draft !== undefined && draft !== currentOverride;

    const currentCoords =
      locality.lat !== null && locality.lng !== null
        ? `${locality.lat}, ${locality.lng}`
        : "";
    const coordDraft = coordDrafts[locality.id];
    const coordsDirty = coordDraft !== undefined && coordDraft !== currentCoords;
    const parsedCoords = coordsDirty ? parseLatLng(coordDraft) : null;
    const coordsInvalid = coordsDirty && parsedCoords === null;

    const save = (patch: SavePatch = {}) =>
      mutation.mutate({
        id: locality.id,
        distance_km_override:
          draft === undefined
            ? locality.distance_km_override
            : draft.trim() === ""
              ? null
              : Number(draft),
        is_deliverable: locality.is_deliverable,
        // Typing in a pin is the verification — that is the whole point of
        // the column.
        coordinates_verified:
          parsedCoords !== null || locality.coordinates_verified,
        ...(parsedCoords && { coordinates: parsedCoords }),
        ...patch,
      });

    return {
      draft,
      currentOverride,
      currentCoords,
      coordDraft,
      coordsInvalid,
      isDirty: (overrideDirty || coordsDirty) && !coordsInvalid,
      outOfRange:
        locality.effective_km !== null && locality.effective_km > maxDeliveryKm,
      save,
    };
  };

  const setDraft = (id: number, value: string) =>
    setDrafts((prev) => ({ ...prev, [id]: value }));
  const setCoordDraft = (id: number, value: string) =>
    setCoordDrafts((prev) => ({ ...prev, [id]: value }));

  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="border-border space-y-3 border-b p-4 lg:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MapPin className="text-primary size-5" />
          المدن والمراكز ({localities.length})
        </h2>
        <p className="text-muted-foreground text-sm">
          مرتبة بالأبعد أولاً. راجع المسافات — الإحداثيات التقريبية قد تعطي رقماً
          غير منطقي. صحّح الإحداثيات من خرائط جوجل (تُعاد حساب المسافة تلقائياً
          وتُعلَّم كمراجَعة)، أو استخدم خانة &quot;مسافة يدوية&quot; لتجاوزها.
        </p>

        {unverified > 0 && (
          <div className="border-accent/40 bg-accent-soft text-accent-foreground flex items-start gap-2 rounded-md border p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
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

      {rows.length === 0 ? (
        <p className="text-muted-foreground p-6 text-center text-sm">
          لا توجد مدن مطابقة لهذا البحث.
        </p>
      ) : (
        <>
          {/* Phone: scan collapsed, edit on demand. */}
          <ul className="divide-border divide-y lg:hidden">
            {rows.map((locality) => {
              const s = rowState(locality);
              return (
                <li key={locality.id}>
                  <details className="group">
                    <summary className="hover:bg-primary-soft/40 flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground font-medium">
                            {locality.name_ar}
                          </span>
                          {s.outOfRange && (
                            <span className="bg-accent-soft text-accent-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                              خارج النطاق
                            </span>
                          )}
                          {!locality.is_deliverable && (
                            <span className="bg-surface-sunken text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                              موقوف
                            </span>
                          )}
                          {!locality.coordinates_verified &&
                            locality.straight_km !== null && (
                              <span
                                className="bg-sale-soft text-sale rounded-full px-2 py-0.5 text-xs font-medium"
                                title="لم تُراجع الإحداثيات"
                              >
                                لم تُراجع
                              </span>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {[
                            locality.governorate_name,
                            locality.order_count > 0
                              ? `${locality.order_count} طلب`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <div className="shrink-0 text-end">
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            s.outOfRange && "text-accent-foreground",
                          )}
                        >
                          {locality.effective_km ?? "—"}
                        </span>
                        <span className="text-muted-foreground text-xs"> كم</span>
                      </div>

                      <ChevronDown className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="bg-surface-sunken/50 space-y-4 px-4 pt-1 pb-4">
                      <div className="space-y-2">
                        <Label htmlFor={`coords-${locality.id}`}>
                          الإحداثيات
                        </Label>
                        <Input
                          id={`coords-${locality.id}`}
                          dir="ltr"
                          placeholder="30.7490, 31.4420"
                          className={cn(
                            "h-11",
                            s.coordsInvalid && "border-destructive",
                          )}
                          aria-invalid={s.coordsInvalid}
                          value={s.coordDraft ?? s.currentCoords}
                          onChange={(e) =>
                            setCoordDraft(locality.id, e.target.value)
                          }
                        />
                        {s.coordsInvalid && (
                          <p className="text-destructive text-xs">
                            صيغة غير صحيحة. الصق الإحداثيات كما تنسخها من خرائط
                            جوجل.
                          </p>
                        )}
                        {locality.lat !== null && locality.lng !== null && (
                          <a
                            href={googleMapsUrl(locality.lat, locality.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex min-h-11 items-center gap-1 text-sm underline"
                          >
                            <ExternalLink className="size-4" />
                            افتح على الخريطة
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">خط مستقيم</Label>
                          <p className="text-muted-foreground tabular-nums">
                            {locality.straight_km ?? "—"} كم
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`override-${locality.id}`} className="text-xs">
                            مسافة يدوية
                          </Label>
                          <Input
                            id={`override-${locality.id}`}
                            type="number"
                            min={0}
                            step="0.1"
                            placeholder="—"
                            className="h-11"
                            value={s.draft ?? s.currentOverride}
                            onChange={(e) =>
                              setDraft(locality.id, e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/*
                       * The whole row is the label, so the switch's 32×18
                       * track is not the only place a thumb can land.
                       */}
                      <div className="divide-border divide-y">
                        <label
                          htmlFor={`deliverable-${locality.id}`}
                          className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium"
                        >
                          متاح للتوصيل
                          <Switch
                            id={`deliverable-${locality.id}`}
                            checked={locality.is_deliverable}
                            onCheckedChange={(checked) =>
                              s.save({ is_deliverable: checked })
                            }
                          />
                        </label>
                        <label
                          htmlFor={`verified-${locality.id}`}
                          className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium"
                        >
                          تمت المراجعة
                          <Switch
                            id={`verified-${locality.id}`}
                            checked={locality.coordinates_verified}
                            onCheckedChange={(checked) =>
                              s.save({ coordinates_verified: checked })
                            }
                          />
                        </label>
                      </div>

                      <Button
                        className="h-11 w-full"
                        disabled={!s.isDirty || mutation.isPending}
                        onClick={() => s.save()}
                      >
                        حفظ
                      </Button>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>

          {/* Desktop: the full audit table. */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-right">
                <tr>
                  <th className="p-4 font-medium">المدينة</th>
                  <th className="p-4 font-medium">المحافظة</th>
                  <th className="p-4 font-medium">الطلبات</th>
                  <th className="p-4 font-medium">الإحداثيات</th>
                  <th className="p-4 font-medium">خط مستقيم</th>
                  <th className="p-4 font-medium">المسافة المستخدمة</th>
                  <th className="p-4 font-medium">مسافة يدوية</th>
                  <th className="p-4 font-medium">متاح</th>
                  <th className="p-4 font-medium">تمت المراجعة</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((locality) => {
                  const s = rowState(locality);
                  return (
                    <tr key={locality.id} className="hover:bg-primary-soft/40">
                      <td className="p-4 font-medium">{locality.name_ar}</td>
                      <td className="text-muted-foreground p-4">
                        {locality.governorate_name}
                      </td>
                      <td className="p-4 tabular-nums">
                        {locality.order_count > 0 ? locality.order_count : "—"}
                      </td>
                      <td className="p-4">
                        <Input
                          dir="ltr"
                          placeholder="30.7490, 31.4420"
                          className={cn(
                            "max-w-[190px] min-w-[170px] text-xs",
                            s.coordsInvalid && "border-destructive",
                          )}
                          aria-invalid={s.coordsInvalid}
                          aria-label={`إحداثيات ${locality.name_ar}`}
                          value={s.coordDraft ?? s.currentCoords}
                          onChange={(e) =>
                            setCoordDraft(locality.id, e.target.value)
                          }
                        />
                        {locality.lat !== null && locality.lng !== null && (
                          <a
                            href={googleMapsUrl(locality.lat, locality.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary mt-1 inline-flex items-center gap-1 text-xs underline"
                          >
                            <ExternalLink className="size-3" />
                            الخريطة
                          </a>
                        )}
                      </td>
                      <td className="text-muted-foreground p-4 tabular-nums">
                        {locality.straight_km ?? "—"}
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            s.outOfRange && "text-accent-foreground",
                          )}
                        >
                          {locality.effective_km ?? "—"}
                          {locality.effective_km !== null && " كم"}
                        </span>
                        {s.outOfRange && (
                          <span className="text-accent-foreground block text-xs">
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
                          aria-label={`مسافة يدوية لـ ${locality.name_ar}`}
                          value={s.draft ?? s.currentOverride}
                          onChange={(e) => setDraft(locality.id, e.target.value)}
                        />
                      </td>
                      <td className="p-4">
                        <Switch
                          aria-label={`متاح للتوصيل: ${locality.name_ar}`}
                          checked={locality.is_deliverable}
                          onCheckedChange={(checked) =>
                            s.save({ is_deliverable: checked })
                          }
                        />
                      </td>
                      <td className="p-4">
                        <Switch
                          aria-label={`تمت مراجعة إحداثيات ${locality.name_ar}`}
                          checked={locality.coordinates_verified}
                          onCheckedChange={(checked) =>
                            s.save({ coordinates_verified: checked })
                          }
                        />
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!s.isDirty || mutation.isPending}
                          onClick={() => s.save()}
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
        </>
      )}
    </div>
  );
}
