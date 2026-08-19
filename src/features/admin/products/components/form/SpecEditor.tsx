"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from "lucide-react";

import { Input } from "@/shared/components/ui/Input";
import { getSpecKeySuggestions } from "../../actions/spec-suggestions";
import { moveItem } from "../../lib/block-types";

interface SpecRow {
  key: string;
  value: string;
}

interface SpecEditorProps {
  value: SpecRow[];
  onChange: (rows: SpecRow[]) => void;
  /** Suggestions are scoped to the selected category. */
  categoryId: string;
}

/**
 * Editor for `products.specifications`.
 *
 * Keys autocomplete from what the selected category already uses. This is not
 * convenience — `groupSpecifications()` matches keys by exact string, so one
 * `السعه` instead of `السعة` silently drops the row out of its group and out of
 * the at-a-glance chips beside the price, and makes two otherwise-identical
 * fridges incomparable.
 *
 * A native `<datalist>` does the autocomplete: it is free, works right-to-left,
 * and still allows a genuinely new key to be typed.
 */
export function SpecEditor({ value, onChange, categoryId }: SpecEditorProps) {
  const listId = useId();

  // Cached per category, so switching between tabs or editing rows does not
  // re-scan every product in the category on each render.
  const { data: suggestions = [] } = useQuery({
    queryKey: ["admin-spec-suggestions", categoryId],
    queryFn: () => getSpecKeySuggestions(categoryId),
    enabled: Boolean(categoryId),
  });

  const update = (index: number, patch: Partial<SpecRow>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const usedKeys = new Set(value.map((row) => row.key.trim()));
  const unusedSuggestions = suggestions.filter((s) => !usedKeys.has(s.key));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          المواصفات الفنية
        </h3>
        <p className="text-sm text-gray-500">
          استخدم نفس أسماء المواصفات المستخدمة في القسم حتى تظهر مجمّعة بشكل صحيح
          وتصلح للمقارنة بين المنتجات.
        </p>
      </div>

      {!categoryId && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          اختر القسم أولاً لعرض المواصفات المقترحة.
        </p>
      )}

      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s.key} value={s.key} />
        ))}
      </datalist>

      <div className="space-y-2">
        {value.map((row, index) => {
          const match = suggestions.find((s) => s.key === row.key.trim());

          return (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40"
            >
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <div>
                  <Input
                    list={listId}
                    value={row.key}
                    onChange={(e) => update(index, { key: e.target.value })}
                    placeholder="اسم المواصفة، مثال: السعة"
                  />
                  {match?.isHighlight && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#4EA674]">
                      <Sparkles className="h-3 w-3" />
                      تظهر بجانب السعر
                    </p>
                  )}
                </div>

                <Input
                  list={match ? `${listId}-${index}` : undefined}
                  value={row.value}
                  onChange={(e) => update(index, { value: e.target.value })}
                  placeholder="القيمة، مثال: 396 لتر"
                />
                {match && match.values.length > 0 && (
                  <datalist id={`${listId}-${index}`}>
                    {match.values.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                <SmallButton
                  title="تحريك لأعلى"
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(value, index, index - 1))}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </SmallButton>
                <SmallButton
                  title="تحريك لأسفل"
                  disabled={index === value.length - 1}
                  onClick={() => onChange(moveItem(value, index, index + 1))}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </SmallButton>
                <SmallButton
                  title="حذف"
                  destructive
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </SmallButton>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange([...value, { key: "", value: "" }])}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-[#4EA674] hover:text-[#4EA674] dark:border-gray-600 dark:text-gray-300"
      >
        <Plus className="h-3.5 w-3.5" />
        إضافة مواصفة
      </button>

      {unusedSuggestions.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            مواصفات شائعة في هذا القسم
          </p>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.slice(0, 20).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onChange([...value, { key: s.key, value: "" }])}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs hover:border-[#4EA674] hover:text-[#4EA674] dark:border-gray-700"
                title={`مستخدمة في ${s.uses} منتج`}
              >
                <Plus className="h-3 w-3" />
                {s.key}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  title,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-1.5 transition-colors disabled:opacity-30 ${
        destructive
          ? "text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
