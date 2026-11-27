"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  variantAxisLabel,
  type AxisRegistry,
} from "@/features/products/constants/variant-axes";
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
import {
  describeFormErrors,
  fieldMessage,
  PRODUCT_FORM_TABS as TABS,
  rowValueMessages,
} from "../lib/form-tabs";
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
  /**
   * Resolved axis registry, so a newly declared axis shows its real label and
   * render kind without a deploy. Omitted falls back to AXIS_REGISTRY.
   */
  axisRegistry?: AxisRegistry;
  /** Edit mode only. */
  productId?: string;
  initialImages?: ManagedImage[];
  legacyHtml?: string | null;
}

export function ProductForm({
  mode,
  defaultValues,
  categories,
  brands,
  groups = [],
  axisRegistry,
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

  /*
   * `?duplicateFrom=<id>` copies everything a variant shares with its sibling
   * and blanks the one thing that differs, so the form opens invalid by design.
   * The field that answers it lives two tabs away, which is why this says so up
   * front instead of letting the admin discover it by pressing save.
   *
   * The prompt names the group's OWN axes. It used to read "(اللون أو المقاس أو
   * نوع الشواية)" — a fixed list — which told the owner of a gas cooker
   * varying by screen type to change a colour or a size it does not have.
   */
  const unansweredAxes =
    mode === "create" && groupId
      ? variantValues
          .filter((row) => row.value.trim().length === 0)
          .map((row) => variantAxisLabel(row.axis, axisRegistry))
      : [];

  const awaitingVariantValue =
    mode === "create" &&
    Boolean(groupId) &&
    (variantValues.length === 0 || unansweredAxes.length > 0);

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

  /*
   * Errors on a hidden tab are invisible, which reads as a dead save button.
   *
   * The errors come from the argument, NOT from the `errors` closure above:
   * react-hook-form validates and only then calls this handler, so on the
   * first failed submit the closure still holds the previous render's empty
   * `formState.errors` and no tab switch happened at all. The user had to
   * click save twice to find out which field was wrong.
   */
  function onInvalid(invalid: FieldErrors<ProductFormValues>) {
    const summary = describeFormErrors(invalid as Record<string, unknown>);
    if (summary.tab) setActiveTab(summary.tab);
    toast.error(summary.message);
  }

  return (
    /*
     * `pb-28` on the phone clears the sticky save bar below; the admin layout
     * already supplies the page gutter, so this form adds none of its own.
     */
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="pb-28 lg:pb-0"
      dir="rtl"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/admin/products"
            className="text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 -ms-1 flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            title="رجوع للمنتجات"
            aria-label="رجوع للمنتجات"
          >
            <ArrowRight className="size-5" />
          </Link>
          {/* The route title is in the admin header; this line names the
              record being edited, which the header cannot know. */}
          {mode === "edit" && (
            <p className="text-muted-foreground min-w-0 truncate text-sm">
              {defaultValues.name_ar}
            </p>
          )}
        </div>

        {/* Desktop keeps save at the top; the phone gets the sticky bar. */}
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring/50 hidden h-11 items-center gap-2 rounded-lg px-5 font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50 lg:inline-flex"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {mode === "create" ? "حفظ المنتج" : "حفظ التعديلات"}
        </button>
      </div>

      {awaitingVariantValue && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-accent-soft p-3 text-sm text-accent-foreground dark:text-accent"
        >
          <span>
            هذه نسخة جديدة داخل مجموعة.{" "}
            {unansweredAxes.length > 0
              ? `حدد ${unansweredAxes.join(" و")} لهذه النسخة قبل الحفظ.`
              : "حدد قيمة الخاصية التي تميّزها عن باقي النسخ قبل الحفظ."}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className="shrink-0 rounded-lg border border-current px-3 py-1.5 font-medium"
          >
            تحديد القيمة
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="no-scrollbar mb-4 flex h-auto w-full snap-x justify-start overflow-x-auto lg:flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="min-h-11 shrink-0 snap-start px-3 whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="border-border bg-card rounded-xl border p-4 lg:p-6">
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

            <div className="rounded-xl border border-border p-4">
              <label className="flex items-center justify-between">
                <span>
                  <span className="font-medium text-foreground">
                    تفعيل عرض خاص
                  </span>
                  <span className="block text-sm text-muted-foreground">
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
              registry={axisRegistry}
              productId={productId}
              groupError={fieldMessage(errors.group_id)}
              valuesError={fieldMessage(errors.variant_values)}
              valueErrors={rowValueMessages(errors.variant_values)}
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
              <details className="rounded-xl border border-border p-4">
                <summary className="min-h-11 cursor-pointer text-sm font-medium text-foreground">
                  الوصف القديم (HTML) — للقراءة فقط
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  يظهر هذا الوصف في صفحة المنتج طالما لم تضف أي أقسام أعلاه. بمجرد
                  إضافة أول قسم يحل المحتوى الجديد محله.
                </p>
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-surface-sunken p-3 text-xs text-muted-foreground">
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

            <div className="space-y-3 border-t border-border pt-6">
              <h3 className="font-semibold text-foreground">
                فيديوهات المنتج
              </h3>
              <p className="text-sm text-muted-foreground">
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

            <div className="space-y-3 border-t border-border pt-6">
              <h3 className="font-semibold text-foreground">
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

      {/*
       * A phone's save control. The form runs to several screens, and the
       * only submit button used to sit above the tab strip — scrolled away
       * for the entire time the admin was actually filling anything in.
       */}
      <div className="border-border bg-surface-raised/95 fixed inset-x-0 bottom-0 z-30 border-t p-3 pb-safe backdrop-blur lg:hidden">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring/50 flex h-12 w-full items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {mode === "create" ? "حفظ المنتج" : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

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
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
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
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
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
        <h3 className="font-semibold text-foreground">
          أبرز المميزات
        </h3>
        <p className="text-sm text-muted-foreground">
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
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="حذف"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="min-h-11 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
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
          <h3 className="font-semibold text-foreground">
            صور المنتج
          </h3>
          <p className="text-sm text-muted-foreground">
            سيتم رفع الصور بعد حفظ المنتج. الصورة الأولى تصبح الصورة الرئيسية.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
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
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          لم يتم اختيار صور بعد.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {previews.map(({ file, url }, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card"
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
                className="absolute start-1 top-1 flex size-8 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-destructive"
                title="إزالة"
              >
                <X className="size-4" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 end-1 rounded bg-success px-1.5 py-0.5 text-[11px] text-success-foreground">
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
