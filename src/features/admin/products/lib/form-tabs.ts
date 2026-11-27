import type { ProductFormValues } from "../schema";

/**
 * Tab layout of the product form, and the routing from a validation error to
 * the tab that can fix it.
 *
 * ---------------------------------------------------------------------------
 * Why this is its own module rather than three consts inside ProductForm.tsx
 *
 * It shipped as a plain `Record<string, string>` map inside the form, and it
 * was MISSING `group_id` and `variant_values`. That single omission is what
 * made adding a variant impossible:
 *
 *   `/admin/products/new?duplicateFrom=<id>` prefills everything from the
 *   source product and deliberately blanks the axis value, because "which
 *   colour is this one" is the question the admin is there to answer. So the
 *   form OPENS invalid, with its only error on `variant_values.0.value` — a
 *   field on the "المواصفات" tab. With no entry in the map, `findTabWithError`
 *   returned undefined, the form stayed on "أساسي", and the only feedback was
 *   a generic toast. The admin saw a save button that did nothing.
 *
 * Typing the map as `Record<keyof ProductFormValues, …>` makes that class of
 * omission a `npm run typecheck` failure instead of a silently unreachable
 * error — the same trick `CONTENT_BLOCKS_MATCH_RENDERER` plays in schema.ts.
 *
 * Kept import-free at runtime (the only import is a type, erased on compile)
 * so it is a zero-mock unit-test target like `order-status.ts`.
 * ---------------------------------------------------------------------------
 */

export const PRODUCT_FORM_TABS = [
  { id: "basic", label: "أساسي" },
  { id: "pricing", label: "السعر والمخزون" },
  { id: "specs", label: "المواصفات" },
  { id: "features", label: "المميزات" },
  { id: "content", label: "المحتوى" },
  { id: "media", label: "الصور و SEO" },
] as const;

export type ProductFormTabId = (typeof PRODUCT_FORM_TABS)[number]["id"];

/**
 * Which tab every form field lives on.
 *
 * Exhaustive over `ProductFormValues` by type. The boolean flags can never
 * carry a message in practice, but they are listed anyway: a partial map is
 * exactly how `variant_values` went missing, and "this field cannot fail" is a
 * claim that stops being true the moment someone adds a `superRefine` rule.
 */
export const FIELD_TABS: Record<keyof ProductFormValues, ProductFormTabId> = {
  name_ar: "basic",
  name_en: "basic",
  sku: "basic",
  slug: "basic",
  category_id: "basic",
  brand_id: "basic",
  warranty_info: "basic",

  basePrice: "pricing",
  offerEnabled: "pricing",
  salePrice: "pricing",
  saleEndDate: "pricing",
  buying_price: "pricing",
  stock_quantity: "pricing",
  low_stock_threshold: "pricing",
  is_active: "pricing",
  is_available: "pricing",
  is_featured: "pricing",
  is_new: "pricing",
  is_best_seller: "pricing",

  // The group editor sits with the specs: the colour a variant differs by is
  // the same fact the spec table states.
  specifications: "specs",
  group_id: "specs",
  variant_values: "specs",

  features: "features",
  content_blocks: "content",

  video_urls: "media",
  meta_title_ar: "media",
  meta_description_ar: "media",
};

/** Field order for reporting, so the message quoted is the first one a reader hits. */
const FIELD_ORDER = Object.keys(FIELD_TABS) as (keyof ProductFormValues)[];

const FALLBACK_MESSAGE = "راجع الحقول المطلوبة";

export interface FormErrorSummary {
  /** Tab to switch to, or undefined when nothing maps (should not happen). */
  tab?: ProductFormTabId;
  /** The specific Arabic message when one can be found, else a generic prompt. */
  message: string;
}

/**
 * Where the form should go, and what it should say, for a failed submit.
 *
 * Takes react-hook-form's `errors` object as `unknown`-valued records so this
 * module needs no react-hook-form import. The shapes it has to survive:
 *
 *   { sku: { message } }                         a plain field
 *   { variant_values: { message } }              a whole-field superRefine issue
 *   { variant_values: [ { value: { message } } ] }  one row of a repeatable field
 *   { video_urls: { unboxing: { message } } }    a nested object field
 */
export function describeFormErrors(
  errors: Readonly<Record<string, unknown>>,
): FormErrorSummary {
  for (const tab of PRODUCT_FORM_TABS) {
    for (const field of FIELD_ORDER) {
      if (FIELD_TABS[field] !== tab.id) continue;
      const node = errors[field];
      if (node === undefined || node === null) continue;
      return { tab: tab.id, message: firstMessage(node) ?? FALLBACK_MESSAGE };
    }
  }

  return { message: FALLBACK_MESSAGE };
}

/** The tab holding the first error, in tab order. */
export function findTabWithError(
  fields: readonly string[],
): ProductFormTabId | undefined {
  for (const tab of PRODUCT_FORM_TABS) {
    if (
      fields.some(
        (field) => FIELD_TABS[field as keyof ProductFormValues] === tab.id,
      )
    ) {
      return tab.id;
    }
  }
  return undefined;
}

/**
 * First `message` string anywhere inside an error node, depth-first.
 *
 * Depth-first rather than reading `.message` directly, because a repeatable
 * field's own node carries no message — the message is on
 * `variant_values[0].value`, one or two levels down.
 */
export function firstMessage(node: unknown): string | undefined {
  if (typeof node === "string") return node.length > 0 ? node : undefined;
  if (node === null || typeof node !== "object") return undefined;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = firstMessage(item);
      if (found) return found;
    }
    return undefined;
  }

  const record = node as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.length > 0) {
    return record.message;
  }

  for (const [key, value] of Object.entries(record)) {
    // `ref` points at the DOM node and `type` is the Zod issue code; neither
    // is worth recursing into and `ref` would walk the whole document.
    if (key === "ref" || key === "type" || key === "types" || key === "root") {
      continue;
    }
    const found = firstMessage(value);
    if (found) return found;
  }

  return undefined;
}

/**
 * Per-row messages for `variant_values[i].value`, by row index.
 *
 * Returns `[]` when the error is attached to the field as a whole rather than
 * to one row — `fieldMessage` covers that case.
 */
export function rowValueMessages(node: unknown): (string | undefined)[] {
  if (!Array.isArray(node)) return [];

  return node.map((row) => {
    if (row === null || typeof row !== "object") return undefined;
    const value = (row as { value?: unknown }).value;
    return firstMessage(value);
  });
}

/** Message attached to a field as a whole, ignoring per-row errors. */
export function fieldMessage(node: unknown): string | undefined {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return undefined;
  }
  const message = (node as { message?: unknown }).message;
  return typeof message === "string" && message.length > 0 ? message : undefined;
}
