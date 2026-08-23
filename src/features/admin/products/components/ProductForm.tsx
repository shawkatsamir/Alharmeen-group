"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/shared/components/ui/Input";
import { Switch } from "@/shared/components/ui/Switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/Tabs";
import { Textarea } from "@/shared/components/ui/Textarea";

import { attachProductImages } from "../actions/product-images";
import { createProduct, updateProductDetails } from "../actions/save-product";
import type { BrandOption, CategoryOption } from "../data";
import { slugifyProduct } from "../lib/slug";
import {
  ACCEPTED_IMAGE_TYPES,
  uploadProductImage,
  validateImageFile,
} from "../lib/storage";
import {
  productFormSchema,
  VIDEO_LABELS,
  type ProductFormValues,
} from "../schema";
import { BlockEditor } from "./form/BlockEditor";
import { ImageManager, type ManagedImage } from "./form/ImageManager";
import { SpecEditor } from "./form/SpecEditor";
import { VariantGroupEditor } from "./form/VariantGroupEditor";
import type { ProductGroupOption } from "../data";

interface ProductFormProps {
  mode: "create" | "edit";
  defaultValues: ProductFormValues;
  categories: CategoryOption[];
  brands: BrandOption[];
  groups?: ProductGroupOption[];
  /** Edit mode only. */
  productId?: string;
  initialImages?: ManagedImage[];
  legacyHtml?: string | null;
}

const TABS = [
  { id: "basic", label: "أساسي" },
  { id: "pricing", label: "السعر والمخزون" },
  { id: "specs", label: "المواصفات" },
  { id: "features", label: "المميزات" },
  { id: "content", label: "المحتوى" },
  { id: "media", label: "الصور و SEO" },
];

export function ProductForm({
  mode,
  defaultValues,
  categories,
  brands,
  groups = [],
  productId,
  initialImages = [],
  legacyHtml,
}: ProductFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("basic");
  const [images, setImages] = useState<ManagedImage[]>(initialImages);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  // Once the slug has been edited by hand, stop overwriting it. Changing a live
  // product's slug also changes its public URL, so it is never auto-synced in
  // edit mode.
  const slugTouched = useRef(mode === "edit");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const { register, control, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;

  const offerEnabled = watch("offerEnabled");
  const categoryId = watch("category_id");
  const groupId = watch("group_id");
  const variantValues = watch("variant_values");
  const nameEn = watch("name_en");
  const sku = watch("sku");

  const groupedCategories = useMemo(() => {
    const groups = new Map<string, CategoryOption[]>();
    for (const category of categories) {
      const key = category.parent_name_ar || "أخرى";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(category);
    }
    return [...groups.entries()];
  }, [categories]);

  function syncSlug(nextNameEn: string | undefined, nextSku: string | undefined) {
    if (slugTouched.current) return;
    const suggestion = slugifyProduct({ nameEn: nextNameEn, sku: nextSku });
    if (suggestion) setValue("slug", suggestion, { shouldValidate: true });
  }

  async function onSubmit(values: ProductFormValues) {
    setSaving(true);
    try {
      if (mode === "edit" && productId) {
        const result = await updateProductDetails(productId, values);
        if (!result.success) {
          toast.error(result.message);
          if (result.field) setActiveTab("basic");
          return;
        }
        toast.success(result.message);
        router.refresh();
        return;
      }

      const result = await createProduct(values);
      if (!result.success || !result.productId) {
        toast.error(result.message);
        if (result.field) setActiveTab("basic");
        return;
      }

      // The product has to exist before its images can be filed under
      // `products/{id}/`, so the queued files are uploaded now.
      if (pendingFiles.length > 0) {
        try {
          const supabase = createClient();
          const uploaded = await Promise.all(
            pendingFiles.map((file) =>
              uploadProductImage(supabase, result.productId!, file),
            ),
          );
          const attached = await attachProductImages(result.productId, uploaded);
          if (!attached.success) toast.error(attached.message);
        } catch (error) {
          // The product itself saved; surface the image failure without losing it.
          toast.error(
            error instanceof Error ? error.message : "تعذر رفع بعض الصور",
          );
        }
      }

      toast.success(result.message);
      router.push(`/admin/products/${result.productId}/edit`);
    } finally {
      setSaving(false);
    }
  }

  function onInvalid() {
    // Errors on a hidden tab are invisible, which reads as a dead save button.
    const firstTab = findTabWithError(Object.keys(errors));
    if (firstTab) setActiveTab(firstTab);
    toast.error("راجع الحقول المطلوبة");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="رجوع للمنتجات"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === "create" ? "إضافة منتج" : "تعديل المنتج"}
            </h1>
            {mode === "edit" && (
              <p className="text-sm text-gray-500">{defaultValues.name_ar}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4EA674] px-5 py-2.5 font-medium text-white hover:bg-[#3d8a5e] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "حفظ المنتج" : "حفظ التعديلات"}
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 h-auto flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-1.5">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          {/* ---------------------------------------------------------- basic */}
          <TabsContent value="basic" className="space-y-4">
            <Field label="اسم المنتج بالعربية" error={errors.name_ar?.message} required>
              <Input {...register("name_ar")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم بالإنجليزية" error={errors.name_en?.message}>
                <Input
                  {...register("name_en", {
                    onChange: (e) => syncSlug(e.target.value, sku),
                  })}
                  dir="ltr"
                />
              </Field>

              <Field label="رمز المنتج (SKU)" error={errors.sku?.message} required>
                <Input
                  {...register("sku", {
                    onChange: (e) => syncSlug(nameEn, e.target.value),
                  })}
                  dir="ltr"
                />
              </Field>
            </div>

            <Field
              label="الرابط (Slug)"
              error={errors.slug?.message}
              required
              hint={
                mode === "edit"
                  ? "تغيير الرابط يغيّر عنوان صفحة المنتج. الروابط القديمة المنشورة لن تعمل."
                  : "يُنشأ تلقائياً من الاسم الإنجليزي ورمز المنتج."
              }
            >
              <Input
                {...register("slug", {
                  onChange: () => {
                    slugTouched.current = true;
                  },
                })}
                dir="ltr"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="القسم" error={errors.category_id?.message} required>
                <select
                  {...register("category_id")}
                  className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
                >
                  <option value="">اختر القسم</option>
                  {groupedCategories.map(([parent, items]) => (
                    <optgroup key={parent} label={parent}>
                      {items.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name_ar}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>

              <Field label="الماركة" error={errors.brand_id?.message} required>
                <select
                  {...register("brand_id")}
                  className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
                >
                  <option value="">اختر الماركة</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name_ar}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="بيانات الضمان" error={errors.warranty_info?.message}>
              <Textarea {...register("warranty_info")} rows={2} />
            </Field>
          </TabsContent>

          {/* -------------------------------------------------------- pricing */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="السعر الأصلي"
                error={errors.basePrice?.message}
                required
                hint="السعر قبل أي خصم."
              >
                <Input
                  type="number"
                  step="0.01"
                  {...register("basePrice", { valueAsNumber: true })}
                />
              </Field>

              <Field
                label="سعر الشراء"
                error={errors.buying_price?.message}
                hint="داخلي، لا يظهر للعملاء. اتركه فارغاً إن لم يكن معروفاً."
              >
                <Input
                  type="number"
                  step="0.01"
                  {...register("buying_price", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                />
              </Field>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <label className="flex items-center justify-between">
                <span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    تفعيل عرض خاص
                  </span>
                  <span className="block text-sm text-gray-500">
                    يظهر المنتج في صفحة العروض بسعر مخفّض.
                  </span>
                </span>
                <Controller
                  control={control}
                  name="offerEnabled"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </label>

              {offerEnabled && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="سعر العرض"
                    error={errors.salePrice?.message}
                    required
                    hint="يجب أن يكون أقل من السعر الأصلي."
                  >
                    <Input
                      type="number"
                      step="0.01"
                      {...register("salePrice", {
                        setValueAs: (v) =>
                          v === "" || v === null ? null : Number(v),
                      })}
                    />
                  </Field>

                  <Field
                    label="تاريخ انتهاء العرض"
                    error={errors.saleEndDate?.message}
                    hint="اتركه فارغاً لعرض مفتوح."
                  >
                    <Input type="datetime-local" {...register("saleEndDate")} />
                  </Field>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الكمية المتاحة" error={errors.stock_quantity?.message}>
                <Input
                  type="number"
                  {...register("stock_quantity", { valueAsNumber: true })}
                />
              </Field>

              <Field
                label="حد التنبيه للمخزون"
                error={errors.low_stock_threshold?.message}
                hint="يظهر تنبيه في لوحة التحكم عند النزول لهذا الحد."
              >
                <Input
                  type="number"
                  {...register("low_stock_threshold", { valueAsNumber: true })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FlagSwitch control={control} name="is_active" label="نشط" hint="إخفاؤه يزيله من المتجر." />
              <FlagSwitch control={control} name="is_available" label="متاح للطلب" />
              <FlagSwitch control={control} name="is_featured" label="منتج مميز" />
              <FlagSwitch control={control} name="is_new" label="جديد" />
              <FlagSwitch control={control} name="is_best_seller" label="الأكثر مبيعاً" />
            </div>
          </TabsContent>

          {/* ---------------------------------------------------------- specs */}
          <TabsContent value="specs" className="space-y-8">
            <Controller
              control={control}
              name="specifications"
              render={({ field }) => (
                <SpecEditor
                  value={field.value}
                  onChange={field.onChange}
                  categoryId={categoryId}
                />
              )}
            />

            {/*
             * Sits with the specs rather than in its own tab: the colour a
             * variant differs by is the same fact the spec table states, and
             * splitting them across tabs is how the two drift apart.
             */}
            <VariantGroupEditor
              groupId={groupId}
              variantValues={variantValues}
              groups={groups}
              onChange={(patch) => {
                setValue("group_id", patch.group_id, { shouldDirty: true });
                setValue("variant_values", patch.variant_values, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </TabsContent>

          {/* ------------------------------------------------------- features */}
          <TabsContent value="features">
            <Controller
              control={control}
              name="features"
              render={({ field }) => (
                <FeatureList value={field.value} onChange={field.onChange} />
              )}
            />
          </TabsContent>

          {/* -------------------------------------------------------- content */}
          <TabsContent value="content" className="space-y-4">
            <Controller
              control={control}
              name="content_blocks"
              render={({ field }) => (
                <BlockEditor
                  value={field.value}
                  onChange={field.onChange}
                  legacyHtml={legacyHtml}
                />
              )}
            />

            {legacyHtml && (
              <details className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                  الوصف القديم (HTML) — للقراءة فقط
                </summary>
                <p className="mt-2 text-sm text-gray-500">
                  يظهر هذا الوصف في صفحة المنتج طالما لم تضف أي أقسام أعلاه. بمجرد
                  إضافة أول قسم يحل المحتوى الجديد محله.
                </p>
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                  {legacyHtml}
                </pre>
              </details>
            )}
          </TabsContent>

          {/* ---------------------------------------------------------- media */}
          <TabsContent value="media" className="space-y-6">
            {mode === "edit" && productId ? (
              <ImageManager
                productId={productId}
                images={images}
                onImagesChange={setImages}
              />
            ) : (
              <PendingImages files={pendingFiles} onChange={setPendingFiles} />
            )}

            <div className="space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                فيديوهات المنتج
              </h3>
              <p className="text-sm text-gray-500">
                استخدم رابط التضمين من يوتيوب (embed)، وليس رابط المشاهدة.
              </p>
              {(Object.keys(VIDEO_LABELS) as (keyof typeof VIDEO_LABELS)[]).map(
                (key) => (
                  <Field key={key} label={VIDEO_LABELS[key]}>
                    <Input
                      {...register(`video_urls.${key}` as const)}
                      dir="ltr"
                      placeholder="https://www.youtube.com/embed/..."
                    />
                  </Field>
                ),
              )}
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                تحسين محركات البحث
              </h3>
              <Field
                label="عنوان الصفحة"
                error={errors.meta_title_ar?.message}
                hint="اتركه فارغاً لاستخدام اسم المنتج."
              >
                <Input {...register("meta_title_ar")} />
              </Field>
              <Field
                label="وصف الصفحة"
                error={errors.meta_description_ar?.message}
                hint="يظهر في نتائج البحث. إن تُرك فارغاً يُشتق من محتوى المنتج."
              >
                <Textarea {...register("meta_description_ar")} rows={3} />
              </Field>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

/** Which tab a given field lives on, so validation errors are reachable. */
const FIELD_TABS: Record<string, string> = {
  name_ar: "basic",
  name_en: "basic",
  sku: "basic",
  slug: "basic",
  category_id: "basic",
  brand_id: "basic",
  warranty_info: "basic",
  basePrice: "pricing",
  salePrice: "pricing",
  saleEndDate: "pricing",
  buying_price: "pricing",
  stock_quantity: "pricing",
  low_stock_threshold: "pricing",
  specifications: "specs",
  features: "features",
  content_blocks: "content",
  video_urls: "media",
  meta_title_ar: "media",
  meta_description_ar: "media",
};

function findTabWithError(fields: string[]): string | undefined {
  for (const tab of TABS) {
    if (fields.some((field) => FIELD_TABS[field] === tab.id)) return tab.id;
  }
  return undefined;
}

function Field({
  label,
  children,
  error,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FlagSwitch({
  control,
  name,
  label,
  hint,
}: {
  control: ReturnType<typeof useForm<ProductFormValues>>["control"];
  name: "is_active" | "is_available" | "is_featured" | "is_new" | "is_best_seller";
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <span>
        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
    </label>
  );
}

function FeatureList({
  value,
  onChange,
}: {
  value: string[];
  onChange: (features: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          أبرز المميزات
        </h3>
        <p className="text-sm text-gray-500">
          تظهر كقائمة بعلامات صح أعلى صفحة المنتج.
        </p>
      </div>

      {value.map((feature, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={feature}
            onChange={(e) =>
              onChange(value.map((f, i) => (i === index ? e.target.value : f)))
            }
            placeholder="مثال: تبريد سريع خلال 30 دقيقة"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            title="حذف"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-[#4EA674] hover:text-[#4EA674] dark:border-gray-600 dark:text-gray-300"
      >
        إضافة ميزة
      </button>
    </div>
  );
}

/**
 * Create mode has no product id yet, so files are queued here and uploaded
 * immediately after the insert succeeds.
 */
function PendingImages({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            صور المنتج
          </h3>
          <p className="text-sm text-gray-500">
            سيتم رفع الصور بعد حفظ المنتج. الصورة الأولى تصبح الصورة الرئيسية.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#4EA674] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d8a5e]"
        >
          <Upload className="h-4 w-4" />
          اختيار صور
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          const problems = selected.map(validateImageFile).filter(Boolean);
          if (problems.length > 0) {
            problems.forEach((p) => toast.error(p!));
            return;
          }
          onChange([...files, ...selected]);
          e.target.value = "";
        }}
      />

      {previews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-600">
          لم يتم اختيار صور بعد.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {previews.map(({ file, url }, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700"
            >
              {/* Object URL, not a remote host — plain <img> avoids the loader. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-contain p-1"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white"
                title="إزالة"
              >
                <X className="h-3 w-3" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 right-1 rounded bg-[#4EA674] px-1.5 py-0.5 text-[10px] text-white">
                  رئيسية
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
