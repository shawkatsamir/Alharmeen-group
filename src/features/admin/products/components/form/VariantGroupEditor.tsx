"use client";

import Link from "next/link";
import { useId } from "react";

import { Input } from "@/shared/components/ui/Input";
import {
  canonicalizeColor,
  normalizeAxisValue,
  variantAxisKind,
  variantAxisLabel,
  variantAxisPrompt,
  type AxisKind,
  type AxisRegistry,
} from "@/features/products/constants/variant-axes";
import type { AxisValueHolder, ProductGroupOption } from "../../data";
import type { VariantValueRow } from "../../schema";

/**
 * Example values per KIND, used only when the group's own members offer none.
 *
 * Deliberately generic. The previous version said "مثال: بشواية" for every
 * unregistered axis, so a gas cooker varying by screen type was prompted with
 * a grill, and the duplicate-value error told the owner to "change the colour
 * or size" of a product that varies by neither. No prompt in this feature may
 * name a specific axis that is not the group's own.
 */
const AXIS_PLACEHOLDERS: Record<AxisKind, string> = {
  color: "اكتب اللون",
  size: "اكتب المقاس أو السعة",
  text: "اكتب القيمة",
};

interface VariantGroupEditorProps {
  groupId: string | null | undefined;
  variantValues: VariantValueRow[];
  groups: ProductGroupOption[];
  /** Resolved axis registry, so a newly declared axis gets its real label. */
  registry?: AxisRegistry;
  /**
   * The product being edited, so its OWN claimed value is not reported as
   * taken. Absent in create mode, where every claimed value really is taken.
   */
  productId?: string;
  /** Validation message for the group select. */
  groupError?: string;
  /** Validation message for the axis values as a whole (e.g. none supplied). */
  valuesError?: string;
  /** Validation message per axis row, by index. */
  valueErrors?: readonly (string | undefined)[];
  onChange: (patch: {
    group_id: string | null;
    variant_values: VariantValueRow[];
  }) => void;
}

/**
 * Editor for `products.group_id` and `products.variant_values`.
 *
 * A variant group is what tells the storefront that three fridges are one
 * fridge in three finishes: it drives the switcher on the product page,
 * collapses the listing grid to one card, and emits the `ProductGroup`
 * structured data that tells Google the same thing.
 *
 * ---------------------------------------------------------------------------
 * What this screen must answer, and once did not
 *
 * 1. "This value is required." It rendered no validation state at all while
 *    being the only place to fill the one field the duplicate-prefill
 *    deliberately blanks, so saving produced a generic toast and nothing else.
 *
 * 2. "Which values are already taken, and by which product?" It showed the
 *    group's existing values as bare `<datalist>` suggestions — every one of
 *    which is a guaranteed `products_group_variant_norm_uniq` violation for a
 *    new variant. And when a SIBLING held the wrong value there was no way to
 *    see it. That is the live Toshiba gas cooker: the product whose name says
 *    شاشة ديجيتال claims "بدون شاشة", so the genuinely screenless one could not
 *    be added, and the form said only that the value was in use. Six failed
 *    saves in two minutes.
 *
 * So claimed values are now listed WITH the SKU holding them and a link to fix
 * that product, duplicates are blocked here rather than by a 409, and the
 * suggestion list offers the vocabulary used for the same axis in OTHER
 * groups — values that are actually available.
 * ---------------------------------------------------------------------------
 */
export function VariantGroupEditor({
  groupId,
  variantValues,
  groups,
  registry,
  productId,
  groupError,
  valuesError,
  valueErrors = [],
  onChange,
}: VariantGroupEditorProps) {
  const listId = useId();
  const selected = groups.find((group) => group.id === groupId) ?? null;

  const selectGroup = (nextId: string) => {
    if (!nextId) {
      // Leaving a group must clear the axis values too, or the product keeps a
      // value that no longer belongs to any group.
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

  /**
   * Values used for the same axis in OTHER groups.
   *
   * These are the only safe suggestions: this group's own values are all
   * forbidden for a new member. They exist for the reason `SpecEditor`
   * suggests spec keys — axis values are matched by exact string, so typing
   * "بدون شواية" in one group and "بلا شواية" in the next makes two groups
   * describe the same distinction two ways.
   */
  const vocabularyFor = (axis: string): string[] => {
    const claimed = new Set(
      (selected?.values[axis] ?? []).map((held) =>
        normalizeAxisValue(axis, held.value),
      ),
    );
    const out: string[] = [];
    for (const group of groups) {
      if (group.id === selected?.id) continue;
      for (const held of group.values[axis] ?? []) {
        const key = normalizeAxisValue(axis, held.value);
        if (claimed.has(key)) continue;
        if (out.some((value) => normalizeAxisValue(axis, value) === key)) continue;
        out.push(held.value);
      }
    }
    return out;
  };

  /** The sibling already holding an equivalent value, if any. */
  const holderOf = (axis: string, value: string): AxisValueHolder | undefined => {
    const typed = normalizeAxisValue(axis, value);
    if (!typed) return undefined;
    return (selected?.values[axis] ?? []).find(
      (held) =>
        held.productId !== productId &&
        normalizeAxisValue(axis, held.value) === typed,
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground dark:text-white">
          المجموعة والنسخ
        </h3>
        <p className="text-sm text-muted-foreground">
          إذا كان هذا المنتج نفس منتج آخر مع اختلاف في خاصية واحدة، اربطهما بنفس
          المجموعة. سيظهر للعميل زر تبديل بين النسخ، وسيظهر المنتج مرة واحدة في
          قوائم المنتجات بدلاً من مرة لكل نسخة.
        </p>
      </div>

      <div>
        <label
          htmlFor={`${listId}-group`}
          className="mb-1 block text-sm font-medium text-foreground"
        >
          المجموعة
        </label>
        <select
          id={`${listId}-group`}
          value={groupId ?? ""}
          onChange={(event) => selectGroup(event.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">بدون مجموعة (منتج مستقل)</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name_ar}
            </option>
          ))}
        </select>
        {groupError ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{groupError}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            المجموعات تُنشأ من لوحة «مجموعة المنتج» أعلى هذه الصفحة.
          </p>
        )}
      </div>

      {selected && (
        <div className="space-y-3 rounded-lg bg-surface-sunken p-3">
          {variantValues.map((row, index) => {
            const axisListId = `${listId}-${row.axis}`;
            const kind = variantAxisKind(row.axis, registry);
            const isColor = kind === "color";
            const label = variantAxisLabel(row.axis, registry);
            const claimed = selected.values[row.axis] ?? [];
            const vocabulary = vocabularyFor(row.axis);
            const taken = holderOf(row.axis, row.value);
            const error = valueErrors[index];

            return (
              <div key={row.axis}>
                <label
                  htmlFor={axisListId}
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {variantAxisPrompt(row.axis, registry)}
                  <span className="mr-1 text-red-500">*</span>
                </label>

                {/*
                  Only values that are NOT already claimed in this group. A
                  datalist of forbidden answers is worse than none.
                */}
                {vocabulary.length > 0 && (
                  <datalist id={`${axisListId}-list`}>
                    {vocabulary.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                )}

                <Input
                  id={axisListId}
                  list={vocabulary.length > 0 ? `${axisListId}-list` : undefined}
                  value={row.value}
                  aria-invalid={error || taken ? true : undefined}
                  placeholder={AXIS_PLACEHOLDERS[kind]}
                  onChange={(event) => updateValue(row.axis, event.target.value)}
                  onBlur={(event) => {
                    // Whitespace is tidied on every axis; only colour has a
                    // canonical-spelling table to fold synonyms through.
                    const tidied = event.target.value.replace(/\s+/g, " ").trim();
                    const next = isColor ? canonicalizeColor(tidied) : tidied;
                    if (next !== event.target.value) updateValue(row.axis, next);
                  }}
                />

                {error && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}

                {/*
                  The 409 this prevents, explained with the product that causes
                  it. Note the comparison is NORMALISED, so "بدون شاشه" is
                  reported as taken by a sibling holding "بدون شاشة".
                */}
                {taken && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    «{taken.value}» مستخدمة بالفعل في{" "}
                    <span className="font-medium">{taken.sku}</span> داخل هذه
                    المجموعة. اختر قيمة أخرى، أو{" "}
                    <Link
                      href={`/admin/products/${taken.productId}/edit`}
                      className="underline"
                    >
                      صحّح قيمة ذلك المنتج
                    </Link>{" "}
                    إن كانت هي الخاطئة.
                  </p>
                )}

                {!error && !taken && !row.value.trim() && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {label} هو ما يميّز هذه النسخة عن باقي المجموعة، وبدونه لا
                    يمكن حفظ المنتج.
                  </p>
                )}

                {claimed.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    مستخدم في المجموعة:{" "}
                    {claimed.map((held, i) => (
                      <span key={held.productId}>
                        {i > 0 && "، "}
                        <Link
                          href={`/admin/products/${held.productId}/edit`}
                          className="underline"
                        >
                          {held.value}
                        </Link>
                        {held.productId === productId && " (هذا المنتج)"}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            );
          })}

          {valuesError && (
            <p className="text-sm text-red-600 dark:text-red-400">{valuesError}</p>
          )}

          {variantValues.length === 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              هذه المجموعة لا تحتوي على خصائص محددة.
            </p>
          )}
        </div>
      )}

      {!selected && (
        <p className="text-xs text-muted-foreground">
          المنتجات المستقلة لا تحتاج إلى تحديد قيمة هنا — يكفي إضافتها ضمن
          المواصفات الفنية.
        </p>
      )}
    </div>
  );
}
