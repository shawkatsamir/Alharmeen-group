import * as z from "zod";

import type { ContentBlock } from "@/features/products/lib/content-blocks";
import { fromDateTimeLocal } from "./lib/datetime";
import { normalizeOfferPricing } from "./lib/pricing";
import { isValidSlug } from "./lib/slug";

/**
 * The single source of truth for admin product authoring.
 *
 * Mirrors the `products` table, including the traps that are invisible from the
 * TypeScript types and only show up as a Postgres error (or worse, silently):
 *
 * - `fts` is a GENERATED column and must never appear in a payload.
 * - `buying_price` has a `> 0` check, not `>= 0`, so an empty field must become
 *   `null` rather than `0`.
 * - `content_blocks` has a `null or jsonb_typeof = 'array'` check, and an empty
 *   array would make the storefront render an empty overview section, so an
 *   empty editor saves `null`.
 * - `features` is Postgres `text[]`, not jsonb.
 * - `video_urls` is a jsonb **object** keyed by clip type, defaulting to `'{}'`.
 * - `specifications` is a flat jsonb object; the form edits it as ordered rows.
 */

/* -------------------------------------------------------------------------- */
/* Content blocks                                                             */
/* -------------------------------------------------------------------------- */

const blockText = (message: string) => z.string().trim().min(1, message);
/**
 * An optional, trimmed string that normalizes "" to undefined.
 *
 * The `.transform()` must come *before* `.optional()`. The other order produces
 * a key that is required but may hold `undefined`, which forces every block
 * factory and every editor patch to spell out fields the author never touched.
 */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v ? v : undefined))
  .optional();

const featureGridItemSchema = z.object({
  title: blockText("عنوان الميزة مطلوب"),
  body: optionalText,
  image: optionalText,
});

const galleryImageSchema = z.object({
  url: blockText("رابط الصورة مطلوب"),
  alt: optionalText,
});

const specHighlightItemSchema = z.object({
  label: blockText("اسم المواصفة مطلوب"),
  value: blockText("قيمة المواصفة مطلوبة"),
});

/**
 * Mirrors the `ContentBlock` union in
 * `features/products/lib/content-blocks.ts`, which the storefront parses at
 * render time. The two must stay in step — see the drift guard below.
 */
export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    text: blockText("نص العنوان مطلوب"),
    level: z.union([z.literal(2), z.literal(3)]).optional(),
  }),
  z.object({
    type: z.literal("paragraph"),
    text: blockText("نص الفقرة مطلوب"),
  }),
  z.object({
    type: z.literal("callout"),
    text: blockText("نص الملاحظة مطلوب"),
    title: optionalText,
  }),
  z.object({
    type: z.literal("list"),
    items: z.array(blockText("عنصر القائمة مطلوب")).min(1, "أضف عنصراً واحداً على الأقل"),
    title: optionalText,
  }),
  z.object({
    type: z.literal("feature"),
    title: blockText("عنوان الميزة مطلوب"),
    body: optionalText,
    image: optionalText,
    imageAlt: optionalText,
    align: z.union([z.literal("start"), z.literal("end")]).optional(),
  }),
  z.object({
    type: z.literal("feature_grid"),
    title: optionalText,
    items: z.array(featureGridItemSchema).min(1, "أضف عنصراً واحداً على الأقل"),
  }),
  z.object({
    type: z.literal("image"),
    url: blockText("رابط الصورة مطلوب"),
    alt: optionalText,
    caption: optionalText,
  }),
  z.object({
    type: z.literal("gallery"),
    images: z.array(galleryImageSchema).min(1, "أضف صورة واحدة على الأقل"),
  }),
  z.object({
    type: z.literal("spec_highlight"),
    items: z.array(specHighlightItemSchema).min(1, "أضف مواصفة واحدة على الأقل"),
  }),
  z.object({
    type: z.literal("video"),
    url: blockText("رابط الفيديو مطلوب"),
    title: optionalText,
  }),
]);

export type ContentBlockInput = z.infer<typeof contentBlockSchema>;

/** Nested item types, so the editor's repeatable rows infer the right shape. */
export type FeatureGridItemInput = Extract<
  ContentBlockInput,
  { type: "feature_grid" }
>["items"][number];
export type GalleryImageInput = Extract<
  ContentBlockInput,
  { type: "gallery" }
>["images"][number];
export type SpecHighlightItemInput = Extract<
  ContentBlockInput,
  { type: "spec_highlight" }
>["items"][number];

/**
 * Compile-time drift guard. If the editor's output stops being assignable to
 * the union the storefront renders, this line stops type-checking — which is a
 * far better failure than `parseContentBlocks` silently dropping the block and
 * leaving a hole in the product page.
 */
type BlocksMatchRenderer = ContentBlockInput extends ContentBlock ? true : false;
export const CONTENT_BLOCKS_MATCH_RENDERER: BlocksMatchRenderer = true;

/* -------------------------------------------------------------------------- */
/* Product form                                                               */
/* -------------------------------------------------------------------------- */

const specRowSchema = z.object({
  key: z.string().trim().min(1, "اسم المواصفة مطلوب"),
  value: z.string().trim().min(1, "قيمة المواصفة مطلوبة"),
});

/**
 * One axis value, e.g. `{ axis: "اللون", value: "سيلفر" }`.
 *
 * Edited as ordered rows for the same reason specifications are: the axis order
 * is the group's, and jsonb key order is not author-controllable.
 */
const variantValueRowSchema = z.object({
  axis: z.string().trim().min(1, "اسم الخاصية مطلوب"),
  value: z.string().trim().min(1, "قيمة الخاصية مطلوبة"),
});

export type VariantValueRow = z.infer<typeof variantValueRowSchema>;

export const VIDEO_KEYS = ["unboxing", "features", "troubleshooting"] as const;
export type VideoKey = (typeof VIDEO_KEYS)[number];

/** Arabic labels for the three `video_urls` slots. */
export const VIDEO_LABELS: Record<VideoKey, string> = {
  unboxing: "فيديو فتح العلبة",
  features: "فيديو المميزات",
  troubleshooting: "فيديو استكشاف الأعطال",
};

export const productFormSchema = z
  .object({
    // Basic
    name_ar: z.string().trim().min(3, "اسم المنتج بالعربية مطلوب"),
    name_en: z.string().trim().optional(),
    sku: z.string().trim().min(2, "رمز المنتج (SKU) مطلوب"),
    slug: z
      .string()
      .trim()
      .min(3, "الرابط مطلوب")
      .refine(isValidSlug, "الرابط يجب أن يحتوي على حروف إنجليزية وأرقام وشرطات فقط"),
    category_id: z.string().uuid("اختر القسم"),
    brand_id: z.string().uuid("اختر الماركة"),
    warranty_info: z.string().trim().optional(),

    // Pricing & stock
    basePrice: z.number().positive("السعر يجب أن يكون رقماً موجباً"),
    offerEnabled: z.boolean(),
    salePrice: z.number().positive("سعر العرض يجب أن يكون رقماً موجباً").nullable().optional(),
    saleEndDate: z.string().trim().nullable().optional(),
    buying_price: z
      .number()
      .positive("سعر الشراء يجب أن يكون رقماً موجباً")
      .nullable()
      .optional(),
    stock_quantity: z.number().int("الكمية يجب أن تكون رقماً صحيحاً").min(0, "الكمية لا يمكن أن تكون سالبة"),
    low_stock_threshold: z
      .number()
      .int("الحد يجب أن يكون رقماً صحيحاً")
      .min(0, "الحد لا يمكن أن يكون سالباً"),

    /*
     * Variant group. Both fields move together: a product either belongs to a
     * group and carries a value for every one of that group's axes, or belongs
     * to no group and carries none. The cross-field rule is enforced in
     * `superRefine` below, because Zod cannot express it field-by-field.
     */
    group_id: z.string().uuid().nullable().optional(),
    variant_values: z.array(variantValueRowSchema),

    // Flags. `is_special_offer` is derived from the offer section, not set here.
    is_active: z.boolean(),
    is_available: z.boolean(),
    is_featured: z.boolean(),
    is_new: z.boolean(),
    is_best_seller: z.boolean(),

    // Rich data
    specifications: z.array(specRowSchema),
    features: z.array(z.string().trim().min(1, "الميزة لا يمكن أن تكون فارغة")),
    content_blocks: z.array(contentBlockSchema),
    video_urls: z.object({
      unboxing: z.string().trim().optional(),
      features: z.string().trim().optional(),
      troubleshooting: z.string().trim().optional(),
    }),

    // SEO
    meta_title_ar: z.string().trim().max(70, "العنوان الطويل يُقتطع في نتائج البحث").optional(),
    meta_description_ar: z
      .string()
      .trim()
      .max(160, "الوصف الطويل يُقتطع في نتائج البحث")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Keep the offer rules in one place; report against the field the store
    // owner can actually fix.
    const pricing = normalizeOfferPricing({
      basePrice: data.basePrice,
      offerEnabled: data.offerEnabled,
      salePrice: data.salePrice,
      saleEndDate: data.saleEndDate,
    });

    if (!pricing.ok) {
      ctx.addIssue({
        code: "custom",
        message: pricing.message,
        path: [data.offerEnabled ? "salePrice" : "basePrice"],
      });
    }

    if (data.offerEnabled && data.saleEndDate?.trim()) {
      const ends = new Date(data.saleEndDate);
      if (Number.isNaN(ends.getTime())) {
        ctx.addIssue({
          code: "custom",
          message: "تاريخ غير صالح",
          path: ["saleEndDate"],
        });
      } else if (ends <= new Date()) {
        ctx.addIssue({
          code: "custom",
          message: "تاريخ انتهاء العرض يجب أن يكون في المستقبل",
          path: ["saleEndDate"],
        });
      }
    }

    // A duplicate spec key would silently overwrite the earlier row when the
    // array collapses into a jsonb object.
    const seen = new Set<string>();
    data.specifications.forEach((row, i) => {
      const key = row.key.trim();
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: "هذه المواصفة مكررة",
          path: ["specifications", i, "key"],
        });
      }
      seen.add(key);
    });

    /*
     * Group membership and axis values move together.
     *
     * A grouped product with no axis value is the failure that matters: it
     * would render as a swatch with no label, and — because the DB's
     * `unique (group_id, variant_values)` index treats NULLs as distinct — a
     * second such product would not even collide. The group would quietly hold
     * two indistinguishable variants.
     */
    const axisSeen = new Set<string>();
    data.variant_values.forEach((row, i) => {
      const axis = row.axis.trim();
      if (axisSeen.has(axis)) {
        ctx.addIssue({
          code: "custom",
          message: "هذه الخاصية مكررة",
          path: ["variant_values", i, "axis"],
        });
      }
      axisSeen.add(axis);
    });

    if (data.group_id && data.variant_values.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "حدد قيمة الخاصية التي يتميز بها هذا المنتج داخل المجموعة",
        path: ["variant_values"],
      });
    }

    if (!data.group_id && data.variant_values.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "اختر المجموعة أولاً",
        path: ["group_id"],
      });
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

/* -------------------------------------------------------------------------- */
/* Form -> database                                                           */
/* -------------------------------------------------------------------------- */

/** Columns this form owns. `fts`, `view_count` and `sales_count` are excluded. */
export interface ProductRowPayload {
  name_ar: string;
  name_en: string | null;
  sku: string;
  slug: string;
  category_id: string;
  brand_id: string;
  warranty_info: string | null;
  group_id: string | null;
  variant_values: Record<string, string> | null;
  price: number;
  old_price: number | null;
  sale_end_date: string | null;
  is_special_offer: boolean;
  buying_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_available: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  specifications: Record<string, string> | null;
  features: string[] | null;
  content_blocks: ContentBlockInput[] | null;
  video_urls: Record<string, string>;
  meta_title_ar: string | null;
  meta_description_ar: string | null;
}

const nullIfBlank = (v: string | null | undefined): string | null => {
  const trimmed = v?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Map validated form values onto the database row.
 *
 * Assumes `productFormSchema` has already passed, so the offer pricing cannot
 * fail here; if it somehow does we fall back to the un-discounted price rather
 * than writing a half-applied offer.
 */
export function toProductRow(values: ProductFormValues): ProductRowPayload {
  const pricing = normalizeOfferPricing({
    basePrice: values.basePrice,
    offerEnabled: values.offerEnabled,
    salePrice: values.salePrice,
    // The form holds a zone-less `datetime-local` value; `sale_end_date` is
    // `timestamptz`, so it has to be anchored to the author's zone here or the
    // offer expires at the wrong moment.
    saleEndDate: fromDateTimeLocal(values.saleEndDate),
  });

  const offer = pricing.ok
    ? pricing.value
    : {
        price: values.basePrice,
        old_price: null,
        sale_end_date: null,
        is_special_offer: false,
      };

  const specifications = values.specifications.reduce<Record<string, string>>(
    (acc, row) => {
      const key = row.key.trim();
      const value = row.value.trim();
      if (key && value) acc[key] = value;
      return acc;
    },
    {},
  );

  const features = values.features
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  /*
   * Axis rows collapse into a jsonb object, exactly like `specifications`.
   *
   * Values are stored as typed. Colour spellings are steered at the input
   * instead — the axis field offers the canonical values of the group's
   * existing variants as a datalist — so what the admin sees saved is what
   * they wrote, and `normalize_color_name()` handles comparison.
   */
  const variantValues = values.variant_values.reduce<Record<string, string>>(
    (acc, row) => {
      const axis = row.axis.trim();
      const value = row.value.trim();
      if (axis && value) acc[axis] = value;
      return acc;
    },
    {},
  );

  const videoUrls = VIDEO_KEYS.reduce<Record<string, string>>((acc, key) => {
    const url = values.video_urls[key]?.trim();
    if (url) acc[key] = url;
    return acc;
  }, {});

  return {
    name_ar: values.name_ar.trim(),
    name_en: nullIfBlank(values.name_en),
    sku: values.sku.trim(),
    slug: values.slug.trim(),
    category_id: values.category_id,
    brand_id: values.brand_id,
    warranty_info: nullIfBlank(values.warranty_info),

    group_id: values.group_id ?? null,
    // Must be null rather than `{}` when ungrouped: the partial unique index on
    // `(group_id, variant_values)` would otherwise see every ungrouped product
    // as the same empty combination.
    variant_values:
      values.group_id && Object.keys(variantValues).length > 0
        ? variantValues
        : null,

    ...offer,

    // `buying_price` is checked `> 0`, so an empty field must be null, not 0.
    buying_price: values.buying_price && values.buying_price > 0 ? values.buying_price : null,
    stock_quantity: values.stock_quantity,
    low_stock_threshold: values.low_stock_threshold,

    is_active: values.is_active,
    is_available: values.is_available,
    is_featured: values.is_featured,
    is_new: values.is_new,
    is_best_seller: values.is_best_seller,

    specifications: Object.keys(specifications).length > 0 ? specifications : null,
    features: features.length > 0 ? features : null,
    // `content_blocks` is checked `null or jsonb array`; an empty array would
    // also render as an empty overview section, so store null instead.
    content_blocks: values.content_blocks.length > 0 ? values.content_blocks : null,
    video_urls: videoUrls,

    meta_title_ar: nullIfBlank(values.meta_title_ar),
    meta_description_ar: nullIfBlank(values.meta_description_ar),
  };
}
