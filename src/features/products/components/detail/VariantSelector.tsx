"use client";

import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import { formatCurrency } from "@/lib/utils";
import {
  axisValueRank,
  colorSwatchHex,
  normalizeAxisValue,
  variantAxisKind,
  variantAxisLabel,
  variantAxisPrompt,
} from "../../constants/variant-axes";
import {
  buildAxisSelectors,
  describeVariant,
  readAxisValue,
  sortVariantMembers,
  type AxisOption,
} from "../../lib/variant-group";
import type { VariantSibling } from "../../types";

interface VariantSelectorProps {
  /** The group's axis keys, in render order. */
  axes: string[];
  /** Every active variant in the group, the current one included. */
  siblings: VariantSibling[];
  /** `products.id` of the variant whose page this is. */
  activeId: string;
}

/**
 * The variant switcher on the product page — one row per axis.
 *
 * ---------------------------------------------------------------------------
 * Every option is a real `<Link>`, never a client-side state toggle.
 *
 * That is the entire SEO point of the feature. Crawlable internal links are
 * what tell Google these pages are one product and let it discover the
 * siblings; a `useState` switcher would render zero links. Each variant is its
 * own statically generated route, so navigation swaps name, images, price,
 * stock and specs for free — there is nothing to synchronise here.
 *
 * Unavailable options stay linked for the same reason. A combination that does
 * not exist links to its nearest neighbour rather than being disabled, and an
 * out-of-stock variant is only dimmed. Hiding either would drop internal links.
 * ---------------------------------------------------------------------------
 *
 * Rendering follows the axis KIND, not the axis name: colour gets an image
 * swatch (a photo of the finish reads far better than a hex chip for
 * appliances), and everything else gets a text pill. An unregistered axis
 * therefore renders as a readable pill rather than a blank square, which is why
 * `text` is the registry default.
 */
export function VariantSelector({
  axes,
  siblings,
  activeId,
}: VariantSelectorProps) {
  // `getVariantSiblings` already returns [] for a group of one, but a caller
  // passing a raw list should not render a selector offering no choice.
  if (siblings.length < 2) return null;

  const selectors = buildAxisSelectors(siblings, axes, activeId, {
    normalize: normalizeAxisValue,
    rank: axisValueRank,
  });

  /*
   * Fall back to one row of whole variants when the axes produce no usable
   * rows — a group whose members carry no values, or whose declared axes do not
   * match what is stored. Dropping the switcher entirely would silently remove
   * the internal links this feature exists to create.
   */
  if (selectors.length === 0) {
    return <WholeVariantRow axes={axes} siblings={siblings} activeId={activeId} />;
  }

  return (
    <div className="mt-5 space-y-4">
      {selectors.map((selector) => (
        <div key={selector.axis}>
          <p className="mb-2 text-sm text-muted-foreground">
            {variantAxisPrompt(selector.axis)}
            {selector.activeValue && (
              <>
                :{" "}
                <span className="font-semibold text-foreground">
                  {selector.activeValue}
                </span>
              </>
            )}
          </p>

          <ul className="flex flex-wrap gap-2">
            {selector.options.map((option) => (
              <li key={option.key}>
                <OptionLink axis={selector.axis} axes={axes} option={option} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function OptionLink({
  axis,
  axes,
  option,
}: {
  axis: string;
  axes: string[];
  option: AxisOption<VariantSibling>;
}) {
  const { value, target, isActive, isExact } = option;
  const inStock = target.is_available && target.stock_quantity > 0;
  const isColor = variantAxisKind(axis) === "color";

  const image =
    target.images?.find((img) => img.is_primary)?.image_url ??
    target.images?.[0]?.image_url;

  // Read the colour axis value directly. Passing the joined multi-axis label
  // here was a real bug: "أسود · 43 بوصة" matches no colour, so every hex chip
  // silently went blank the moment a group gained a second axis.
  const hex = isColor ? colorSwatchHex(readAxisValue(target.variant_values, axis)) : null;

  /*
   * Two different kinds of "you cannot have this", with different copy.
   *
   * Out of stock  — this exact variant exists but is not in the warehouse.
   * Not exact     — the combination asked for does not exist at all, and the
   *                 link goes somewhere near it instead.
   *
   * Conflating them would tell a shopper a colour is unavailable when it is
   * merely unavailable *in the size they were looking at*.
   */
  const note = !inStock
    ? "غير متوفر"
    : !isExact
      ? `مع ${describeVariant(target.variant_values, axes.filter((a) => a !== axis))}`
      : null;

  const ariaLabel = [
    value,
    !isExact ? `— ${variantAxisLabel(axis)} متاح مع ${describeVariant(target.variant_values, axes.filter((a) => a !== axis))}` : "",
    `— ${formatCurrency(target.price)}`,
    inStock ? "" : "— غير متوفر",
  ]
    .filter(Boolean)
    .join(" ");

  const className = [
    "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
    isActive ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50",
    inStock ? "" : "opacity-55",
    !isExact ? "border-dashed" : "",
    isColor ? "w-20" : "min-w-20 px-3",
  ].join(" ");

  return (
    <Link
      href={`/product/${target.slug}`}
      prefetch
      aria-current={isActive ? "page" : undefined}
      aria-label={ariaLabel}
      title={value}
      className={className}
    >
      {/*
       * Colour shows the finish; every other axis shows its value as text. The
       * hex chip is a fallback for a colour variant with no photo yet, and a
       * plain pill is the fallback when there is neither — which is the state
       * the Midea no-grill microwave is actually in.
       */}
      {isColor && (image || hex) && (
        <span className="relative block h-14 w-full overflow-hidden rounded bg-surface-sunken">
          {image ? (
            <Img src={image} alt="" fill sizes="80px" className="object-contain p-0.5" />
          ) : (
            <span
              aria-hidden="true"
              className="block h-full w-full"
              style={{ backgroundColor: hex! }}
            />
          )}
        </span>
      )}

      <span className="w-full truncate text-center text-[11px] leading-tight">
        {value}
      </span>

      {note && (
        <span className="w-full truncate text-center text-[10px] leading-none text-sale">
          {note}
        </span>
      )}
    </Link>
  );
}

/**
 * The pre-existing single row of whole variants, kept as a safety net.
 *
 * Reached only when per-axis rows cannot be built. It is less informative than
 * the axis rows but it still emits every sibling link, which is what matters.
 */
function WholeVariantRow({
  axes,
  siblings,
  activeId,
}: {
  axes: string[];
  siblings: VariantSibling[];
  activeId: string;
}) {
  const members = sortVariantMembers(siblings);

  return (
    <div className="mt-5">
      <p className="mb-2 text-sm text-muted-foreground">اختر النسخة</p>
      <ul className="flex flex-wrap gap-2">
        {members.map((member) => {
          const label = describeVariant(member.variant_values, axes) || member.name_ar;
          const isActive = member.id === activeId;
          const inStock = member.is_available && member.stock_quantity > 0;
          const image =
            member.images?.find((img) => img.is_primary)?.image_url ??
            member.images?.[0]?.image_url;

          return (
            <li key={member.id}>
              <Link
                href={`/product/${member.slug}`}
                prefetch
                aria-current={isActive ? "page" : undefined}
                aria-label={`${label} — ${formatCurrency(member.price)}${inStock ? "" : " (غير متوفر)"}`}
                title={label}
                className={[
                  "flex w-20 flex-col items-center gap-1 rounded-lg border p-1.5 transition",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  isActive
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/50",
                  inStock ? "" : "opacity-55",
                ].join(" ")}
              >
                {image && (
                  <span className="relative block h-14 w-full overflow-hidden rounded bg-surface-sunken">
                    <Img
                      src={image}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain p-0.5"
                    />
                  </span>
                )}
                <span className="w-full truncate text-center text-[11px] leading-tight">
                  {label}
                </span>
                {!inStock && (
                  <span className="text-[10px] leading-none text-sale">غير متوفر</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
