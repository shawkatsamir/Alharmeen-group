import {
  AXIS_REGISTRY,
  type AxisDefinition,
  type AxisKind,
  type AxisRegistry,
} from "../constants/variant-axes";

/**
 * Merge `variant_axes` rows over the built-in axis defaults.
 *
 * Its own module, with no imports but the registry it merges into, for the same
 * reason `specifications.ts` and `variant-group.ts` are: it is the zero-mock
 * unit-test target. The fetcher that calls it (`services/server/variant-axes`)
 * pulls in `next/headers` through the Supabase client, which a node-env test
 * cannot import.
 *
 * ---------------------------------------------------------------------------
 * This is the boundary between "a string from Postgres" and "a value the
 * renderer switches on".
 *
 * `kind` and `schema_property` are VALIDATED here rather than cast. The columns
 * carry CHECK constraints, so a bad value should be impossible — but `kind` is
 * what `VariantSelector` switches on to decide between an image swatch and a
 * text pill, and an unrecognised string would match no branch and render
 * nothing at all. A cast would turn a data problem into a blank product page.
 *
 * Every rejection falls back rather than throwing: an unrecognised kind takes
 * the built-in definition's kind, then `text`. The storefront must not gain a
 * new way to fail just because axes became editable.
 * ---------------------------------------------------------------------------
 */

/** The row shape `getAxisRegistry` reads from `variant_axes`. */
export interface VariantAxisRow {
  key: string;
  label_ar: string | null;
  kind: string | null;
  schema_property: string | null;
  spec_aliases: string[] | null;
  display_order: number | null;
}

const AXIS_KINDS: readonly AxisKind[] = ["color", "size", "text"];

type SchemaProperty = NonNullable<AxisDefinition["schemaProperty"]>;

const SCHEMA_PROPERTIES: readonly SchemaProperty[] = [
  "color",
  "size",
  "material",
  "pattern",
  "model",
];

export function mergeAxisRegistry(
  rows: readonly VariantAxisRow[],
): AxisRegistry {
  const merged: Record<string, AxisDefinition> = { ...AXIS_REGISTRY };

  for (const row of rows) {
    const key = row.key?.trim();
    if (!key) continue;

    const builtIn = AXIS_REGISTRY[key];

    const kind = AXIS_KINDS.includes(row.kind as AxisKind)
      ? (row.kind as AxisKind)
      : (builtIn?.kind ?? "text");

    const schemaProperty = SCHEMA_PROPERTIES.includes(
      row.schema_property as SchemaProperty,
    )
      ? (row.schema_property as SchemaProperty)
      : undefined;

    const aliases = (row.spec_aliases ?? [])
      .map((alias) => alias?.trim())
      .filter((alias): alias is string => Boolean(alias) && alias !== key);

    merged[key] = {
      kind,
      // A blank label would render an empty prompt ("اختر "), so fall through
      // to the built-in label and then to the key itself.
      label: row.label_ar?.trim() || builtIn?.label || key,
      /*
       * Deliberately NOT `?? builtIn?.schemaProperty`. A row is the admin's
       * statement about this axis; inheriting the built-in property would make
       * it impossible to REMOVE one — and claiming `size` for an axis that is
       * not a size is a wrong statement to Google, not a cosmetic one.
       */
      ...(schemaProperty ? { schemaProperty } : {}),
      ...(aliases.length > 0 ? { specAliases: aliases } : {}),
      order: row.display_order ?? builtIn?.order,
    };
  }

  return merged;
}
