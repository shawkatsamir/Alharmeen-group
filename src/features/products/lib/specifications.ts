/**
 * Specification grouping.
 *
 * Products store `specifications` as a flat jsonb object. Real catalog data
 * ranges from 13 keys (dishwashers) to 48 (gas water heaters), and the keys are
 * category-shaped rather than brand-shaped: a Hoover, a Tornado and a Sharp
 * vacuum share ~90% of their keys, while a vacuum and a washing machine share
 * almost none.
 *
 * Rather than maintain one hand-written template per category, groups are
 * derived from the key names themselves. That keeps a single product-page
 * design working for every category, including ones added later, and degrades
 * to a single "detailed" group when nothing matches.
 *
 * This module is deliberately import-free so it can be unit-tested with no
 * mocks, in the same spirit as `features/orders/constants/order-status.ts`.
 */

export interface SpecEntry {
  key: string;
  label: string;
  value: string;
}

export interface SpecGroup {
  id: string;
  label: string;
  entries: SpecEntry[];
}

/**
 * A handful of products were entered with English snake_case keys instead of
 * Arabic. Translate the known ones; anything else falls back to a humanized
 * form of the raw key so an unexpected key renders rather than disappearing.
 */
const ENGLISH_KEY_LABELS: Record<string, string> = {
  brand: "الماركة",
  capacity: "السعة",
  capacity_liters: "السعة (لتر)",
  color: "اللون",
  colors: "الألوان",
  cooling_system: "نظام التبريد",
  dimensions: "الأبعاد",
  doors: "عدد الأبواب",
  energy_efficiency: "مستوى كفاءة الطاقة",
  model: "موديل المنتج",
  origin: "بلد المنشأ",
  power: "القدرة الكهربائية",
  type: "النوع",
  warranty: "الضمان",
  weight: "الوزن",
};

interface GroupRule {
  id: string;
  label: string;
  /** Ordered: the first rule that matches a key wins. */
  match: (key: string) => boolean;
}

const startsWithAny = (key: string, prefixes: string[]) =>
  prefixes.some((p) => key.startsWith(p));

const isAnyOf = (key: string, exact: string[]) => exact.includes(key);

/**
 * Order matters. More specific rules come first so that e.g.
 * "حماية ضغط المياه" lands in safety rather than performance, and
 * "الأبعاد - العرض" lands in dimensions rather than the catch-all.
 */
const GROUP_RULES: GroupRule[] = [
  {
    id: "dimensions",
    label: "الأبعاد والوزن",
    match: (key) =>
      startsWithAny(key, ["الأبعاد", "الابعاد", "الوزن", "dimensions", "weight"]) ||
      isAnyOf(key, ["المقاس", "الحجم", "قطر المدخنة"]),
  },
  {
    id: "safety",
    label: "الأمان والحماية",
    match: (key) =>
      startsWithAny(key, ["حماية", "قفل ضد", "نظام الإشعال", "نظام الاشعال"]) ||
      isAnyOf(key, [
        "الفصل التلقائي",
        "إنذار صوتي",
        "انذار صوتي",
        "مؤشر البطارية",
        "علبة البطاريات",
      ]),
  },
  {
    id: "performance",
    label: "الأداء والطاقة",
    match: (key) =>
      startsWithAny(key, [
        "القدرة الكهربائية",
        "قوة الشفط",
        "معدل الدوران",
        "مستوى كفاءة الطاقة",
        "كفاءة الطاقة",
        "energy_efficiency",
        "power",
      ]) ||
      isAnyOf(key, [
        "السعة",
        "capacity",
        "capacity_liters",
        "مستوى الضوضاء",
        "عدد مستويات الطاقة",
        "نظام الطاقة",
        "التبديل بين مصادر الطاقة",
        "نظام التبريد",
        "cooling_system",
      ]),
  },
  {
    id: "general",
    label: "معلومات عامة",
    match: (key) =>
      isAnyOf(key, [
        "موديل المنتج",
        "model",
        "بلد المنشأ",
        "origin",
        "النوع",
        "type",
        "الألوان",
        "اللون",
        "color",
        "colors",
        "الضمان",
        "warranty",
        "الماركة",
        "brand",
      ]),
  },
];

const CATCH_ALL: Omit<GroupRule, "match"> = {
  id: "details",
  label: "المواصفات التفصيلية",
};

/** Turn `capacity_liters` into `capacity liters` for unknown English keys. */
function humanizeKey(key: string): string {
  return ENGLISH_KEY_LABELS[key] ?? key.replace(/_/g, " ").trim();
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join("، ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${humanizeKey(k)}: ${stringifyValue(v)}`)
      .join("، ");
  }
  return String(value).trim();
}

/**
 * Group a raw `specifications` object into labelled sections.
 * Returns `[]` for null/empty/non-object input so callers can skip the section
 * entirely rather than render an empty heading.
 */
export function groupSpecifications(specifications: unknown): SpecGroup[] {
  if (
    !specifications ||
    typeof specifications !== "object" ||
    Array.isArray(specifications)
  ) {
    return [];
  }

  const buckets = new Map<string, SpecGroup>();

  for (const [rawKey, rawValue] of Object.entries(
    specifications as Record<string, unknown>,
  )) {
    const value = stringifyValue(rawValue);
    // Drop keys with no usable value — an empty row is worse than no row.
    if (!value) continue;

    const key = rawKey.trim();
    const rule = GROUP_RULES.find((r) => r.match(key));
    const groupId = rule?.id ?? CATCH_ALL.id;
    const groupLabel = rule?.label ?? CATCH_ALL.label;

    if (!buckets.has(groupId)) {
      buckets.set(groupId, { id: groupId, label: groupLabel, entries: [] });
    }
    buckets.get(groupId)!.entries.push({
      key,
      label: humanizeKey(key),
      value,
    });
  }

  // Stable, meaningful order: general first, then the rest, catch-all last.
  const order = ["general", "performance", "dimensions", "safety", "details"];
  return order
    .map((id) => buckets.get(id))
    .filter((g): g is SpecGroup => Boolean(g));
}

/** Total number of renderable spec rows, for "show all" thresholds. */
export function countSpecs(groups: SpecGroup[]): number {
  return groups.reduce((sum, g) => sum + g.entries.length, 0);
}

/**
 * The few specs worth surfacing next to the price rather than buried in the
 * table. Returns at most `limit` entries, in priority order, skipping any that
 * the product doesn't have.
 */
const HIGHLIGHT_PRIORITY = [
  "السعة",
  "capacity_liters",
  "capacity",
  "القدرة الكهربائية",
  "قوة الشفط",
  "معدل الدوران",
  "نظام التبريد",
  "cooling_system",
  "مستوى كفاءة الطاقة",
  "energy_efficiency",
  "النوع",
  "نوع التحميل",
  "بلد المنشأ",
];

export function pickSpecHighlights(
  specifications: unknown,
  limit = 4,
): SpecEntry[] {
  const all = groupSpecifications(specifications).flatMap((g) => g.entries);
  if (all.length === 0) return [];

  const byKey = new Map(all.map((e) => [e.key, e]));
  const picked: SpecEntry[] = [];

  for (const key of HIGHLIGHT_PRIORITY) {
    const entry = byKey.get(key);
    if (entry && !picked.some((p) => p.key === entry.key)) {
      picked.push(entry);
    }
    if (picked.length === limit) break;
  }

  return picked;
}
