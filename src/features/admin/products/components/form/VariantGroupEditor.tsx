"use client";

import { useId } from "react";

import { Input } from "@/shared/components/ui/Input";
import {
  VARIANT_AXES,
  canonicalizeColor,
  normalizeColorName,
  variantAxisPrompt,
} from "@/features/products/constants/variant-axes";
import type { ProductGroupOption } from "../../data";
import type { VariantValueRow } from "../../schema";

interface VariantGroupEditorProps {
  groupId: string | null | undefined;
  variantValues: VariantValueRow[];
  groups: ProductGroupOption[];
  onChange: (patch: {
    group_id: string | null;
    variant_values: VariantValueRow[];
  }) => void;
}

/**
 * Editor for `products.group_id` and `products.variant_values`.
 *
 * A variant group is what tells the storefront that three fridges are one
 * fridge in three finishes: it drives the colour switcher on the product page,
 * collapses the listing grid to one card, and emits the `ProductGroup`
 * structured data that tells Google the same thing.
 *
 * Axis values autocomplete from what the chosen group's other variants already
 * use, for exactly the reason `SpecEditor` autocompletes spec keys: values are
 * matched by exact string. One "فضي" typed into a group whose other variant
 * says "سيلفر" produces two swatches for one finish. The colour axis goes
 * further and canonicalises on blur, because that particular pair had already
 * drifted across the live catalogue before this feature existed.
 */
export function VariantGroupEditor({
  groupId,
  variantValues,
  groups,
  onChange,
}: VariantGroupEditorProps) {
  const listId = useId();
  const selected = groups.find((group) => group.id === groupId) ?? null;

  const selectGroup = (nextId: string) => {
    if (!nextId) {
      // Leaving a group must clear the axis values too, or the product keeps a
      // colour that no longer belongs to any group.
      onChange({ group_id: null, variant_values: [] });
      return;
    }

    const group = groups.find((g) => g.id === nextId);
    if (!group) return;

    // Preserve anything already typed for an axis the new group also has.
    const existing = new Map(
      variantValues.map((row) => [row.axis, row.value] as const),
    );

    onChange({
      group_id: nextId,
      variant_values: group.axes.map((axis) => ({
        axis,
        value: existing.get(axis) ?? "",
      })),
    });
  };

  const updateValue = (axis: string, value: string) => {
    onChange({
      group_id: groupId ?? null,
      variant_values: variantValues.map((row) =>
        row.axis === axis ? { ...row, value } : row,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          المجموعة والألوان
        </h3>
        <p className="text-sm text-gray-500">
          إذا كان هذا المنتج نفس منتج آخر بلون أو مقاس مختلف، اربطهما بنفس
          المجموعة. سيظهر للعميل زر تبديل بين الألوان، وسيظهر المنتج مرة واحدة في
          قوائم المنتجات بدلاً من مرة لكل لون.
        </p>
      </div>

      <div>
        <label
          htmlFor={`${listId}-group`}
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          المجموعة
        </label>
        <select
          id={`${listId}-group`}
          value={groupId ?? ""}
          onChange={(event) => selectGroup(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">بدون مجموعة (منتج مستقل)</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name_ar}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          المجموعات تُنشأ من صفحة المنتج الأصلي عبر زر «أضف لوناً جديداً».
        </p>
      </div>

      {selected && (
        <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
          {variantValues.map((row) => {
            const suggestions = selected.values[row.axis] ?? [];
            const axisListId = `${listId}-${row.axis}`;
            const isColor = row.axis === "اللون";

            // Warn when the typed value differs only in spelling from one the
            // group already uses — the case that silently splits a swatch row.
            const clash =
              isColor &&
              row.value.trim().length > 0 &&
              suggestions.find(
                (existing) =>
                  existing !== row.value.trim() &&
                  normalizeColorName(existing) === normalizeColorName(row.value),
              );

            return (
              <div key={row.axis}>
                <label
                  htmlFor={axisListId}
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {variantAxisPrompt(row.axis)}
                </label>

                <datalist id={`${axisListId}-list`}>
                  {suggestions.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>

                <Input
                  id={axisListId}
                  list={`${axisListId}-list`}
                  value={row.value}
                  placeholder={isColor ? "مثال: أسود" : ""}
                  onChange={(event) => updateValue(row.axis, event.target.value)}
                  onBlur={(event) => {
                    if (!isColor) return;
                    const canonical = canonicalizeColor(event.target.value);
                    if (canonical !== event.target.value) {
                      updateValue(row.axis, canonical);
                    }
                  }}
                />

                {clash && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    يوجد لون بنفس المعنى في هذه المجموعة باسم «{clash}». استخدم
                    نفس الكتابة حتى لا يظهر اللون مرتين.
                  </p>
                )}
              </div>
            );
          })}

          {variantValues.length === 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              هذه المجموعة لا تحتوي على خصائص محددة.
            </p>
          )}
        </div>
      )}

      {!selected && VARIANT_AXES.length > 0 && (
        <p className="text-xs text-gray-500">
          المنتجات المستقلة لا تحتاج إلى تحديد لون هنا — يكفي إضافته ضمن
          المواصفات الفنية.
        </p>
      )}
    </div>
  );
}
