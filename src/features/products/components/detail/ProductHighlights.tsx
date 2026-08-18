import { Check } from "lucide-react";

/**
 * `products.features` is a `text[]`. Rendered as a two-column checklist.
 * Callers skip this section when the array is empty.
 */
export function ProductHighlights({ features }: { features: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {features.map((feature, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 rounded-lg bg-surface-sunken px-4 py-3"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm leading-relaxed">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

/** Normalize the raw column into clean strings, dropping blanks. */
export function normalizeFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => (typeof f === "string" ? f.trim() : String(f ?? "").trim()))
    .filter((f) => f.length > 0);
}
