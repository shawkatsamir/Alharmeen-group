/**
 * Single source of truth for product variant axes.
 *
 * This module MIRRORS the database:
 *   - `normalize_color_name()` -> normalizeColorName()
 *   - the review list in section 4 of the migration -> CANONICAL_COLORS
 * See supabase/migrations/20260823090000_variant_data_hygiene.sql.
 * If you change the rules here, change them there in the same commit.
 *
 * Keep this file free of imports, for the same reason order-status.ts and
 * payment.ts are: it is the zero-mock unit-test target (variant-axes.test.ts).
 *
 * ---------------------------------------------------------------------------
 * Why axis keys reuse the existing specification keys
 *
 * `اللون` and `السعة` are already spec keys on 68 and 62 products respectively,
 * and `groupSpecifications()` in ../lib/specifications.ts matches keys by exact
 * string. Inventing a parallel vocabulary for axes would mean the buy-box
 * selector and the spec table disagreed about what a product's colour is. So an
 * axis key IS a spec key — the axis just marks which of them varies.
 *
 * Colour is never *validated* against a list. An unrecognised colour is
 * normalised and kept, because the alternative is a save that fails at 11pm
 * because the supplier invented a finish nobody has typed before.
 * ---------------------------------------------------------------------------
 */

/** Axis keys the group model understands, in the order selectors render. */
export const VARIANT_AXES = ["اللون", "السعة", "موديل المنتج"] as const;

export type VariantAxis = (typeof VARIANT_AXES)[number];

export function isVariantAxis(value: unknown): value is VariantAxis {
  return (
    typeof value === "string" && (VARIANT_AXES as readonly string[]).includes(value)
  );
}

/**
 * Tashkeel: the Arabic diacritic block U+064B–U+0652 plus superscript alef
 * U+0670. Stripped before anything else so "أَسود" pasted from a vowelled
 * supplier sheet collapses onto "أسود".
 */
const TASHKEEL = /[ً-ْٰ]/g;

/**
 * Orthographic folds, matching the Postgres `translate('أإآةىـ', 'اااهي')`.
 * Tatweel (U+0640) maps to the empty string because its `to` position is past
 * the end of the Postgres target string, which deletes rather than replaces.
 */
const ARABIC_FOLDS: Readonly<Record<string, string>> = {
  "أ": "ا", // أ -> ا
  "إ": "ا", // إ -> ا
  "آ": "ا", // آ -> ا
  "ة": "ه", // ة -> ه
  "ى": "ي", // ى -> ي
  "ـ": "", // ـ (tatweel) -> deleted
} as const;

/**
 * The TypeScript twin of `normalize_color_name()` in Postgres.
 *
 * Returns a *comparison key*, not a display value. Two colours are the same
 * colour when their keys match; what the customer sees is the stored text.
 *
 * Step order matches the SQL exactly — strip tashkeel, collapse internal
 * whitespace runs, trim, fold, lowercase — because a divergence here means the
 * admin form and the database disagree about whether two variants collide.
 */
export function normalizeColorName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(TASHKEEL, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[أإآةىـ]/g, (char) => ARABIC_FOLDS[char] ?? char)
    .toLowerCase();
}

/**
 * Spelling variants folded onto the form the shop actually writes, keyed by
 * normalised form. Mirrors the review list applied to `specifications` by the
 * hygiene migration.
 *
 * Conservative on purpose. "اينوكس" (inox) and "أوف وايت" (off-white) are absent
 * because they are plausibly distinct finishes in this catalogue, and merging a
 * colour that turns out to be real is far more expensive to undo than leaving
 * two spellings an admin can reconcile by hand.
 *
 * Note "استانلس غامق" is deliberately NOT folded onto "استانلس" — dark stainless
 * is a separate finish, and RF-480TV/RF-580TV each sell both.
 */
export const CANONICAL_COLORS: Readonly<Record<string, string>> = {
  [normalizeColorName("اسود")]: "أسود",
  [normalizeColorName("فضي")]: "سيلفر",
  [normalizeColorName("استانلس ستيل")]: "استانلس",
} as const;

/**
 * The display spelling for a colour. Unknown colours are returned trimmed and
 * whitespace-collapsed but otherwise untouched.
 */
export function canonicalizeColor(value: string | null | undefined): string {
  if (!value) return "";
  const key = normalizeColorName(value);
  return CANONICAL_COLORS[key] ?? value.replace(/\s+/g, " ").trim();
}

/** True when two colour names refer to the same colour. */
export function isSameColor(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeColorName(a);
  return left.length > 0 && left === normalizeColorName(b);
}

/**
 * Fallback swatch colours, used only when a variant has no image of its own.
 *
 * The primary swatch UI is the variant's own product photo — for appliances a
 * photo of the actual finish reads far better than a hex chip, and it needs no
 * authoring. These exist so a half-populated product still renders something
 * meaningful. Two-tone finishes use their dominant colour.
 */
export const COLOR_SWATCH_HEX: Readonly<Record<string, string>> = {
  [normalizeColorName("أسود")]: "#1c1c1c",
  [normalizeColorName("أبيض")]: "#f5f5f5",
  [normalizeColorName("أوف وايت")]: "#efe9dd",
  [normalizeColorName("سيلفر")]: "#c4c8cc",
  [normalizeColorName("سيلفر غامق")]: "#8e9295",
  [normalizeColorName("سيلفر زجاجي")]: "#c9ced4",
  [normalizeColorName("استانلس")]: "#b8bcc0",
  [normalizeColorName("استانلس غامق")]: "#6b6f73",
  [normalizeColorName("اينوكس")]: "#a9aeb2",
  [normalizeColorName("أسود زجاجي")]: "#141414",
  [normalizeColorName("رمادي")]: "#8a8d91",
  [normalizeColorName("أحمر")]: "#b3261e",
  [normalizeColorName("أزرق")]: "#1d4ed8",
  [normalizeColorName("كحلي")]: "#1e293b",
} as const;

/** Hex fallback for a colour name, or null when it is not a colour we know. */
export function colorSwatchHex(value: string | null | undefined): string | null {
  if (!value) return null;
  return COLOR_SWATCH_HEX[normalizeColorName(canonicalizeColor(value))] ?? null;
}

export const VARIANT_AXIS_LABELS: Readonly<Record<VariantAxis, string>> = {
  اللون: "اللون",
  السعة: "السعة",
  "موديل المنتج": "الموديل",
} as const;

/**
 * Arabic prompt shown above a selector, e.g. "اختر اللون".
 * Falls back to the raw key so a group with a hand-typed axis still renders.
 */
export function variantAxisPrompt(axis: string): string {
  const label = isVariantAxis(axis) ? VARIANT_AXIS_LABELS[axis] : axis;
  return `اختر ${label}`;
}
