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

/* -------------------------------------------------------------------------- */
/* Axis registry                                                              */
/* -------------------------------------------------------------------------- */

/**
 * How an axis renders and sorts.
 *
 *   color — image swatch, falling back to a hex chip then to a text pill
 *   size  — text pill, ordered by the number inside the value
 *   text  — text pill, ordered by the order its members appear in
 *
 * `text` is the DEFAULT for anything unregistered, and that is the whole
 * robustness argument: a shop owner inventing "نوع الشواية" or "عدد الأبواب"
 * gets a readable pill immediately, with no code change and no blank swatch.
 * Only colour needs to be recognised to render well.
 */
export type AxisKind = "color" | "size" | "text";

export interface AxisDefinition {
  kind: AxisKind;
  /** Shown in the selector prompt, e.g. "اختر <label>". */
  label: string;
  /**
   * The schema.org Product property that honestly expresses this axis, when one
   * exists. Absent means the axis is real but has no standard vocabulary —
   * a grill is not `color`, `size`, `material` or `pattern` — so structured data
   * omits it rather than inventing a property name.
   */
  schemaProperty?: "color" | "size" | "material" | "pattern" | "model";
  /**
   * Other `specifications` keys that state this axis's fact.
   *
   * An axis key IS a spec key, but the catalogue spells colour two ways —
   * `الألوان` on 68 products, `اللون` on 7 — so "does the spec table agree with
   * the switcher" cannot be answered by looking at one key. Mirrors
   * `variant_axes.spec_aliases` and the SQL `axis_spec_keys()`.
   *
   * NOT a normalisation device: these stay distinct keys, and
   * `groupSpecifications()` still matches them separately.
   */
  specAliases?: readonly string[];
  /** Ordering for the admin's axis suggestions. Lower first. */
  order?: number;
}

/**
 * A resolved axis registry: the DB's `variant_axes` rows merged over the
 * built-in defaults below. Plain object so it can be handed from a server
 * component to a client one without serialisation ceremony.
 */
export type AxisRegistry = Readonly<Record<string, AxisDefinition>>;

/**
 * Axis keys are SPEC keys — see the header note. Both colour spellings appear
 * because the catalogue uses `الألوان` on 68 products and `اللون` on 7.
 *
 * ---------------------------------------------------------------------------
 * This is now the FALLBACK, not the whole truth.
 *
 * Presentation metadata lives in the `variant_axes` table, so the shop owner
 * can declare a new axis — label, kind, schema.org property — without a
 * deploy. This object remains:
 *
 *   - the seed that migration 20261121090000 inserted,
 *   - the compile-time default for every call site that has no registry to
 *     hand (listing grids, unit tests, anything server-rendered before the
 *     registry is fetched),
 *   - the reason an axis keeps working if the table is empty or unreachable.
 *
 * Resolution is a chain, never a switch: supplied registry -> this object ->
 * `{ kind: 'text', label: key }`. Nothing can make an axis stop rendering.
 * ---------------------------------------------------------------------------
 */
export const AXIS_REGISTRY: AxisRegistry = {
  اللون: {
    kind: "color",
    label: "اللون",
    schemaProperty: "color",
    specAliases: ["الألوان"],
    order: 10,
  },
  الألوان: {
    kind: "color",
    label: "اللون",
    schemaProperty: "color",
    specAliases: ["اللون"],
    order: 11,
  },
  المقاس: { kind: "size", label: "المقاس", schemaProperty: "size", order: 20 },
  السعة: { kind: "size", label: "السعة", schemaProperty: "size", order: 30 },
  الحجم: { kind: "size", label: "الحجم", schemaProperty: "size", order: 31 },
  "حجم الشاشة": {
    kind: "size",
    label: "حجم الشاشة",
    schemaProperty: "size",
    order: 40,
  },
  البوصة: { kind: "size", label: "المقاس", schemaProperty: "size", order: 41 },
  "نوع الشواية": { kind: "text", label: "نوع الشواية", order: 50 },
  "نوع الشاشة": { kind: "text", label: "نوع الشاشة", order: 51 },
  "موديل المنتج": {
    kind: "text",
    label: "الموديل",
    schemaProperty: "model",
    order: 90,
  },
};

/** The default every unregistered axis gets. The end of the fallback chain. */
const UNREGISTERED: AxisKind = "text";

/**
 * Resolve one axis through the fallback chain.
 *
 * `registry?.[axis]` wins WHOLE, not field by field: a row the admin has
 * edited is their deliberate statement about that axis, and letting a built-in
 * `schemaProperty` leak back in would make the admin unable to remove one.
 * `getAxisRegistry()` already merges the table over the defaults, so a
 * resolved registry is complete by the time it arrives here.
 */
export function resolveAxis(
  axis: string,
  registry?: AxisRegistry,
): AxisDefinition {
  return (
    registry?.[axis] ??
    AXIS_REGISTRY[axis] ?? { kind: UNREGISTERED, label: axis }
  );
}

/**
 * Suggested axes for the admin picker, in declared order. Not a validation
 * gate — any key works, which is the point.
 *
 * `VARIANT_AXES` is kept as the import-free constant the tests pin; prefer
 * `suggestedAxes(registry)` in the UI so a newly declared axis shows up.
 */
export const VARIANT_AXES = [
  "اللون",
  "المقاس",
  "السعة",
  "حجم الشاشة",
  "نوع الشواية",
  "موديل المنتج",
] as const;

export function suggestedAxes(registry?: AxisRegistry): string[] {
  const source = registry ?? AXIS_REGISTRY;
  return Object.keys(source).sort((a, b) => {
    const orderA = source[a]?.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = source[b]?.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    // Code-unit comparison, not localeCompare: ICU collation for Arabic
    // differs between the build server and the browser.
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

export function isVariantAxis(value: unknown, registry?: AxisRegistry): boolean {
  if (typeof value !== "string") return false;
  return value in (registry ?? AXIS_REGISTRY);
}

export function variantAxisKind(axis: string, registry?: AxisRegistry): AxisKind {
  return resolveAxis(axis, registry).kind;
}

export function variantAxisLabel(axis: string, registry?: AxisRegistry): string {
  return resolveAxis(axis, registry).label;
}

export function variantAxisSchemaProperty(
  axis: string,
  registry?: AxisRegistry,
): AxisDefinition["schemaProperty"] {
  return resolveAxis(axis, registry).schemaProperty;
}

/**
 * The `specifications` keys that may state a given axis: the axis key itself,
 * then its declared aliases. Mirrors the SQL `axis_spec_keys()`.
 *
 * The axis key comes first so a product carrying both spellings is read from
 * the one the group actually declares.
 */
export function axisSpecKeys(axis: string, registry?: AxisRegistry): string[] {
  const aliases = resolveAxis(axis, registry).specAliases ?? [];
  return [axis, ...aliases.filter((alias) => alias !== axis)];
}

/**
 * The colour axis of a group, if it has one.
 *
 * Callers that want a colour swatch must read the colour axis value directly.
 * Reading the joined multi-axis label instead is a real bug that shipped: a
 * two-axis group produces "أسود · 43 بوصة", which matches no colour, so every
 * swatch silently degrades.
 */
export function findColorAxis(
  axes: readonly string[],
  registry?: AxisRegistry,
): string | null {
  return axes.find((axis) => variantAxisKind(axis, registry) === "color") ?? null;
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Tashkeel: the Arabic diacritic block U+064B–U+0652 plus superscript alef
 * U+0670. Stripped before anything else so "أَسود" pasted from a vowelled
 * supplier sheet collapses onto "أسود".
 */
const TASHKEEL = /[ً-ْٰ]/g;

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"; // U+0660–U+0669
const EXTENDED_ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹"; // U+06F0–U+06F9

function digitFolds(): Record<string, string> {
  const folds: Record<string, string> = {};
  for (let i = 0; i < 10; i += 1) {
    folds[ARABIC_INDIC_DIGITS[i]] = String(i);
    folds[EXTENDED_ARABIC_INDIC_DIGITS[i]] = String(i);
  }
  return folds;
}

/**
 * Orthographic folds, matching the Postgres `translate()` in
 * `normalize_axis_value()`. Tatweel (U+0640) maps to the empty string because
 * its position in the SQL `from` string is past the end of `to`, which deletes
 * rather than replaces — which is why tatweel must stay LAST in that string.
 */
const ARABIC_FOLDS: Readonly<Record<string, string>> = {
  "أ": "ا", // أ -> ا
  "إ": "ا", // إ -> ا
  "آ": "ا", // آ -> ا
  "ة": "ه", // ة -> ه
  "ى": "ي", // ى -> ي
  ...digitFolds(),
  "ـ": "", // ـ (tatweel) -> deleted
} as const;

/*
 * The two digit blocks MUST be two separate ranges.
 *
 * A single `[٠-۹]` would span everything between them, swallowing the
 * Arabic percent sign ٪ (U+066A), the Arabic decimal separator ٫ (U+066B), and
 * a large slice of Arabic letters. This is the highest-risk character class in
 * the codebase and it has its own test.
 */
const FOLDABLE = /[أإآةىـ٠-٩۰-۹]/g;

/**
 * The TypeScript twin of `normalize_axis_value()` in Postgres.
 *
 * Returns a *comparison key*, not a display value. Two axis values are the same
 * value when their keys match; what the customer sees is the stored text.
 *
 * Step order matches the SQL exactly — strip tashkeel, collapse internal
 * whitespace runs, trim, fold, lowercase — because a divergence here means the
 * admin form and the database disagree about whether two variants collide.
 *
 * ---------------------------------------------------------------------------
 * The `axis` parameter is deliberately unused today.
 *
 * It is NOT a hook for per-axis rules, and unit synonyms (كجم/كيلوجرام,
 * فرد/أفراد) are deliberately NOT folded here: normalisation decides *identity*,
 * so a wrong fold merges two genuinely different products and the unique index
 * then rejects a legitimate save. All size intelligence lives in
 * `axisValueRank`, where a wrong answer merely reorders a row.
 *
 * It exists for signature symmetry with the SQL function. A unique index depends
 * on that function, and changing its signature later means dropping and
 * rebuilding the index — so the unused argument is paid now to avoid that.
 * ---------------------------------------------------------------------------
 */
export function normalizeAxisValue(
  axis: string,
  value: string | null | undefined,
): string {
  void axis;
  if (!value) return "";
  return value
    .replace(TASHKEEL, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(FOLDABLE, (char) => ARABIC_FOLDS[char] ?? char)
    .toLowerCase();
}

/**
 * Colour-specific alias of the generic normaliser, kept so every existing call
 * site and the `CANONICAL_COLORS` keys below stay untouched. Mirrors the SQL
 * `normalize_color_name()`, which is likewise a thin wrapper.
 */
export function normalizeColorName(value: string | null | undefined): string {
  return normalizeAxisValue("اللون", value);
}

/**
 * Numeric magnitude of a size value, or null when the axis has no natural
 * numeric order.
 *
 * Gated on the axis kind so a model code like "SJ-58C" is never read as the
 * number 58. Digits are already ASCII by the time this runs, so "٤٣ بوصة" and
 * "43 بوصة" rank identically.
 */
export function axisValueRank(
  axis: string,
  value: string | null | undefined,
  registry?: AxisRegistry,
): number | null {
  if (variantAxisKind(axis, registry) !== "size") return null;
  const match = normalizeAxisValue(axis, value).match(/-?\d+(?:[.,٫]\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(/[,٫]/, "."));
  return Number.isFinite(parsed) ? parsed : null;
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
  [normalizeColorName("رمادي فاتح")]: "#b6b9bc",
  [normalizeColorName("رمادي غامق")]: "#5b5f63",
  [normalizeColorName("أحمر")]: "#b3261e",
  [normalizeColorName("أزرق")]: "#1d4ed8",
  [normalizeColorName("كحلي")]: "#1e293b",
} as const;

/** Hex fallback for a colour name, or null when it is not a colour we know. */
export function colorSwatchHex(value: string | null | undefined): string | null {
  if (!value) return null;
  return COLOR_SWATCH_HEX[normalizeColorName(canonicalizeColor(value))] ?? null;
}

/**
 * Arabic prompt shown above a selector row, e.g. "اختر اللون".
 * Falls back to the raw key so an unregistered axis still reads correctly.
 */
export function variantAxisPrompt(axis: string, registry?: AxisRegistry): string {
  return `اختر ${variantAxisLabel(axis, registry)}`;
}
