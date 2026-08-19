"use client";

import { ChevronDown, ChevronUp, Eye, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { RichContent } from "@/features/products/components/detail/RichContent";
import { Input } from "@/shared/components/ui/Input";
import { Textarea } from "@/shared/components/ui/Textarea";
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  createBlock,
  moveItem,
} from "../../lib/block-types";
import type {
  ContentBlockInput,
  FeatureGridItemInput,
  GalleryImageInput,
  SpecHighlightItemInput,
} from "../../schema";
import { ImageUrlField } from "../media/ImageUrlField";

interface BlockEditorProps {
  value: ContentBlockInput[];
  onChange: (blocks: ContentBlockInput[]) => void;
  /** Legacy `description_ar`, shown read-only for reference while migrating. */
  legacyHtml?: string | null;
}

/**
 * Editor for `products.content_blocks`.
 *
 * Controlled rather than wired field-by-field into react-hook-form: blocks are a
 * discriminated union, and RHF's typed field paths (`content_blocks.0.text`)
 * cannot express "this key exists only on some members". Holding the array as a
 * single controlled value keeps the union intact and lets the zod schema do the
 * validating on submit.
 *
 * Reordering uses buttons, not drag-and-drop — the repo has no DnD dependency,
 * and buttons behave predictably in an RTL layout.
 */
export function BlockEditor({ value, onChange, legacyHtml }: BlockEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  const update = (index: number, patch: Partial<ContentBlockInput>) => {
    onChange(
      value.map((block, i) =>
        i === index ? ({ ...block, ...patch } as ContentBlockInput) : block,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            محتوى صفحة المنتج
          </h3>
          <p className="text-sm text-gray-500">
            يظهر في قسم «نظرة عامة على المنتج». التنسيق يتم تلقائياً.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          <Eye className="h-4 w-4" />
          {showPreview ? "إخفاء المعاينة" : "معاينة"}
        </button>
      </div>

      {showPreview && (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
          {value.length > 0 ? (
            <RichContent blocks={value} legacyHtml={null} />
          ) : (
            <p className="text-center text-sm text-gray-500">
              لا يوجد محتوى للمعاينة بعد.
            </p>
          )}
        </div>
      )}

      {value.length === 0 && !showPreview && (
        <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-600">
          لم تتم إضافة أي أقسام بعد.
          {legacyHtml
            ? " سيظل الوصف القديم ظاهراً حتى تضيف أول قسم."
            : ""}
        </p>
      )}

      <div className="space-y-3">
        {value.map((block, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {BLOCK_LABELS[block.type]}
              </span>

              <div className="flex items-center gap-1">
                <IconButton
                  title="تحريك لأعلى"
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(value, index, index - 1))}
                >
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  title="تحريك لأسفل"
                  disabled={index === value.length - 1}
                  onClick={() => onChange(moveItem(value, index, index + 1))}
                >
                  <ChevronDown className="h-4 w-4" />
                </IconButton>
                <IconButton
                  title="حذف القسم"
                  destructive
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            <BlockFields
              block={block}
              onPatch={(patch) => update(index, patch)}
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          إضافة قسم
        </p>
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((meta) => (
            <button
              key={meta.type}
              type="button"
              title={meta.hint}
              onClick={() => onChange([...value, createBlock(meta.type)])}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:border-[#4EA674] hover:text-[#4EA674] dark:border-gray-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onPatch,
}: {
  block: ContentBlockInput;
  onPatch: (patch: Partial<ContentBlockInput>) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="النص">
            <Input
              value={block.text}
              onChange={(e) => onPatch({ text: e.target.value })}
              placeholder="مثال: تبريد ذكي بتقنية النانو"
            />
          </Field>
          <Field label="الحجم">
            <select
              value={block.level ?? 2}
              onChange={(e) =>
                onPatch({ level: Number(e.target.value) === 3 ? 3 : 2 })
              }
              className="h-9 rounded-md border border-input bg-input-background px-3 text-sm"
            >
              <option value={2}>عنوان رئيسي</option>
              <option value={3}>عنوان فرعي</option>
            </select>
          </Field>
        </div>
      );

    case "paragraph":
      return (
        <Field label="النص">
          <Textarea
            value={block.text}
            onChange={(e) => onPatch({ text: e.target.value })}
            rows={4}
          />
        </Field>
      );

    case "callout":
      return (
        <div className="space-y-3">
          <Field label="العنوان (اختياري)">
            <Input
              value={block.title ?? ""}
              onChange={(e) => onPatch({ title: e.target.value || undefined })}
            />
          </Field>
          <Field label="النص">
            <Textarea
              value={block.text}
              onChange={(e) => onPatch({ text: e.target.value })}
              rows={3}
            />
          </Field>
        </div>
      );

    case "list":
      return (
        <div className="space-y-3">
          <Field label="العنوان (اختياري)">
            <Input
              value={block.title ?? ""}
              onChange={(e) => onPatch({ title: e.target.value || undefined })}
            />
          </Field>
          <StringList
            label="النقاط"
            items={block.items}
            onChange={(items) => onPatch({ items })}
            placeholder="نقطة جديدة"
          />
        </div>
      );

    case "feature":
      return (
        <div className="space-y-3">
          <Field label="العنوان">
            <Input
              value={block.title}
              onChange={(e) => onPatch({ title: e.target.value })}
            />
          </Field>
          <Field label="النص (اختياري)">
            <Textarea
              value={block.body ?? ""}
              onChange={(e) => onPatch({ body: e.target.value || undefined })}
              rows={3}
            />
          </Field>
          <ImageUrlField
            value={block.image}
            onChange={(image) => onPatch({ image })}
          />
          <Field label="وصف الصورة (اختياري)">
            <Input
              value={block.imageAlt ?? ""}
              onChange={(e) => onPatch({ imageAlt: e.target.value || undefined })}
            />
          </Field>
          <Field label="جهة الصورة">
            <select
              value={block.align ?? "auto"}
              onChange={(e) =>
                onPatch({
                  align:
                    e.target.value === "start"
                      ? "start"
                      : e.target.value === "end"
                        ? "end"
                        : undefined,
                })
              }
              className="h-9 rounded-md border border-input bg-input-background px-3 text-sm"
            >
              <option value="auto">تلقائي (متبادل)</option>
              <option value="start">في البداية</option>
              <option value="end">في النهاية</option>
            </select>
          </Field>
        </div>
      );

    case "feature_grid":
      return (
        <div className="space-y-3">
          <Field label="العنوان (اختياري)">
            <Input
              value={block.title ?? ""}
              onChange={(e) => onPatch({ title: e.target.value || undefined })}
            />
          </Field>
          <RepeatableItems<FeatureGridItemInput>
            label="المميزات"
            items={block.items}
            onChange={(items) => onPatch({ items })}
            create={() => ({ title: "" })}
            render={(item, update) => (
              <div className="space-y-2">
                <Input
                  value={item.title}
                  onChange={(e) => update({ ...item, title: e.target.value })}
                  placeholder="عنوان الميزة"
                />
                <Textarea
                  value={item.body ?? ""}
                  onChange={(e) =>
                    update({ ...item, body: e.target.value || undefined })
                  }
                  placeholder="وصف مختصر"
                  rows={2}
                />
                <ImageUrlField
                  label="صورة الميزة (اختياري)"
                  value={item.image}
                  onChange={(image) => update({ ...item, image })}
                />
              </div>
            )}
          />
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <ImageUrlField
            value={block.url}
            onChange={(url) => onPatch({ url: url ?? "" })}
          />
          <Field label="وصف الصورة (اختياري)">
            <Input
              value={block.alt ?? ""}
              onChange={(e) => onPatch({ alt: e.target.value || undefined })}
            />
          </Field>
          <Field label="تعليق أسفل الصورة (اختياري)">
            <Input
              value={block.caption ?? ""}
              onChange={(e) => onPatch({ caption: e.target.value || undefined })}
            />
          </Field>
        </div>
      );

    case "gallery":
      return (
        <RepeatableItems<GalleryImageInput>
          label="الصور"
          items={block.images}
          onChange={(images) => onPatch({ images })}
          create={() => ({ url: "" })}
          render={(item, update) => (
            <div className="space-y-2">
              <ImageUrlField
                value={item.url}
                onChange={(url) => update({ ...item, url: url ?? "" })}
              />
              <Input
                value={item.alt ?? ""}
                onChange={(e) =>
                  update({ ...item, alt: e.target.value || undefined })
                }
                placeholder="وصف الصورة (اختياري)"
              />
            </div>
          )}
        />
      );

    case "spec_highlight":
      return (
        <RepeatableItems<SpecHighlightItemInput>
          label="المواصفات البارزة"
          items={block.items}
          onChange={(items) => onPatch({ items })}
          create={() => ({ label: "", value: "" })}
          render={(item, update) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={item.label}
                onChange={(e) => update({ ...item, label: e.target.value })}
                placeholder="الاسم، مثال: السعة"
              />
              <Input
                value={item.value}
                onChange={(e) => update({ ...item, value: e.target.value })}
                placeholder="القيمة، مثال: 396 لتر"
              />
            </div>
          )}
        />
      );

    case "video":
      return (
        <div className="space-y-3">
          <Field label="رابط التضمين">
            <Input
              value={block.url}
              onChange={(e) => onPatch({ url: e.target.value })}
              placeholder="https://www.youtube.com/embed/..."
              dir="ltr"
            />
          </Field>
          <Field label="العنوان (اختياري)">
            <Input
              value={block.title ?? ""}
              onChange={(e) => onPatch({ title: e.target.value || undefined })}
            />
          </Field>
        </div>
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function IconButton({
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

function StringList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <RepeatableItems
      label={label}
      items={items}
      onChange={onChange}
      create={() => ""}
      render={(item, update) => (
        <Input
          value={item}
          onChange={(e) => update(e.target.value)}
          placeholder={placeholder}
        />
      )}
    />
  );
}

function RepeatableItems<T>({
  label,
  items,
  onChange,
  create,
  render,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40"
        >
          <div className="flex-1">
            {render(item, (next) =>
              onChange(items.map((it, i) => (i === index ? next : it))),
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <IconButton
              title="تحريك لأعلى"
              disabled={index === 0}
              onClick={() => onChange(moveItem(items, index, index - 1))}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              title="تحريك لأسفل"
              disabled={index === items.length - 1}
              onClick={() => onChange(moveItem(items, index, index + 1))}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              title="حذف"
              destructive
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, create()])}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-[#4EA674] hover:text-[#4EA674] dark:border-gray-600 dark:text-gray-300"
      >
        <Plus className="h-3.5 w-3.5" />
        إضافة
      </button>
    </div>
  );
}
