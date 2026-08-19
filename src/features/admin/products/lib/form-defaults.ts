import { parseContentBlocks } from "@/features/products/lib/content-blocks";
import type { Product } from "@/features/products/types";

import type { ContentBlockInput, ProductFormValues } from "../schema";
import { toDateTimeLocal } from "./datetime";
import { toOfferFormValues } from "./pricing";

/**
 * Build form values for the create and edit pages.
 *
 * `specifications` is stored as a flat jsonb object but edited as ordered rows,
 * because object key order is not a thing an author can control and the store
 * owner needs to be able to put "الضمان" wherever they want it.
 */

export function emptyProductFormValues(): ProductFormValues {
  return {
    name_ar: "",
    name_en: "",
    sku: "",
    slug: "",
    category_id: "",
    brand_id: "",
    warranty_info: "",

    basePrice: 0,
    offerEnabled: false,
    salePrice: null,
    saleEndDate: "",
    buying_price: null,
    stock_quantity: 0,
    low_stock_threshold: 5,

    is_active: true,
    is_available: true,
    is_featured: false,
    is_new: true,
    is_best_seller: false,

    specifications: [],
    features: [],
    content_blocks: [],
    video_urls: { unboxing: "", features: "", troubleshooting: "" },

    meta_title_ar: "",
    meta_description_ar: "",
  };
}

export function toProductFormValues(product: Product): ProductFormValues {
  const offer = toOfferFormValues({
    price: product.price,
    old_price: product.old_price,
    sale_end_date: product.sale_end_date,
    is_special_offer: product.is_special_offer,
  });

  return {
    name_ar: product.name_ar ?? "",
    name_en: product.name_en ?? "",
    sku: product.sku ?? "",
    slug: product.slug ?? "",
    category_id: product.category_id ?? "",
    brand_id: product.brand_id ?? "",
    warranty_info: product.warranty_info ?? "",

    basePrice: offer.basePrice,
    offerEnabled: offer.offerEnabled,
    salePrice: offer.salePrice,
    saleEndDate: toDateTimeLocal(offer.saleEndDate),
    buying_price: product.buying_price ?? null,
    stock_quantity: product.stock_quantity ?? 0,
    low_stock_threshold: product.low_stock_threshold ?? 5,

    is_active: product.is_active,
    is_available: product.is_available,
    is_featured: product.is_featured,
    is_new: product.is_new,
    is_best_seller: product.is_best_seller,

    specifications: toSpecRows(product.specifications),
    features: (product.features ?? []).filter((f) => f.trim().length > 0),
    // Reuse the storefront parser so the editor only ever loads blocks the
    // renderer would actually display — anything it would drop is dropped here
    // too, rather than being silently re-saved.
    content_blocks: parseContentBlocks(product.content_blocks) as ContentBlockInput[],
    video_urls: toVideoFields(product.video_urls),

    meta_title_ar: product.meta_title_ar ?? "",
    meta_description_ar: product.meta_description_ar ?? "",
  };
}

function toSpecRows(specifications: unknown): { key: string; value: string }[] {
  if (
    !specifications ||
    typeof specifications !== "object" ||
    Array.isArray(specifications)
  ) {
    return [];
  }

  return Object.entries(specifications as Record<string, unknown>)
    .map(([key, value]) => ({ key: key.trim(), value: stringifySpecValue(value) }))
    .filter((row) => row.key.length > 0 && row.value.length > 0);
}

/**
 * Mirrors `stringifyValue` in `features/products/lib/specifications.ts` so a
 * product saved from this form renders identically to one typed by hand.
 */
function stringifySpecValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) {
    return value.map(stringifySpecValue).filter(Boolean).join("، ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${stringifySpecValue(v)}`)
      .join("، ");
  }
  return String(value).trim();
}

function toVideoFields(raw: unknown): ProductFormValues["video_urls"] {
  const empty = { unboxing: "", features: "", troubleshooting: "" };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;

  const source = raw as Record<string, unknown>;
  const read = (key: string) =>
    typeof source[key] === "string" ? (source[key] as string).trim() : "";

  return {
    unboxing: read("unboxing"),
    features: read("features"),
    troubleshooting: read("troubleshooting"),
  };
}
