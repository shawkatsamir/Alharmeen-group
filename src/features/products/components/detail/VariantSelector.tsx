"use client";

import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import { formatCurrency } from "@/lib/utils";
import { colorSwatchHex, variantAxisPrompt } from "../../constants/variant-axes";
import { describeVariant, sortVariantMembers } from "../../lib/variant-group";
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
 * The colour/finish switcher on the product page.
 *
 * ---------------------------------------------------------------------------
 * Every swatch is a real `<Link>`, never a client-side state toggle.
 *
 * That is the entire SEO point of the feature. Crawlable internal links are
 * what tell Google these pages are one product and let it discover the
 * siblings; a `useState` switcher would render zero links and the variants
 * would stay as unlinked as they were before. Each variant is its own
 * statically generated route, so navigation swaps name, images, price, stock
 * and specs for free — there is nothing to synchronise here.
 * ---------------------------------------------------------------------------
 *
 * Out-of-stock variants stay linked rather than being hidden or disabled, for
 * the same reason: hiding them would drop the internal links. They are only
 * dimmed and captioned.
 *
 * One row per group rather than a cross-product grid. Each member is one
 * choice, labelled with all of its axis values, which stays correct for any
 * number of axes. If the catalogue ever grows groups that vary by colour *and*
 * capacity, this should become one row per axis with unavailable combinations
 * filtered out — but the shop sells no such product today, and a combination
 * matrix built for a case that does not exist would be untested code.
 */
export function VariantSelector({
  axes,
  siblings,
  activeId,
}: VariantSelectorProps) {
  // `getVariantSiblings` already returns [] for a group of one, but a caller
  // passing a raw list should not render a selector offering no choice.
  if (siblings.length < 2) return null;

  const members = sortVariantMembers(siblings);
  const active = members.find((member) => member.id === activeId);
  const activeLabel = active ? describeVariant(active.variant_values, axes) : "";
  const prompt = axes.map(variantAxisPrompt).join(" و");

  return (
    <div className="mt-5">
      <p className="mb-2 text-sm text-muted-foreground">
        {prompt}
        {activeLabel && (
          <>
            :{" "}
            <span className="font-semibold text-foreground">{activeLabel}</span>
          </>
        )}
      </p>

      <ul className="flex flex-wrap gap-2">
        {members.map((member) => {
          const label =
            describeVariant(member.variant_values, axes) || member.name_ar;
          const isActive = member.id === activeId;
          const inStock = member.is_available && member.stock_quantity > 0;
          const image =
            member.images?.find((img) => img.is_primary)?.image_url ??
            member.images?.[0]?.image_url;
          const hex = colorSwatchHex(label);

          return (
            <li key={member.id}>
              <Link
                href={`/product/${member.slug}`}
                prefetch
                aria-current={isActive ? "page" : undefined}
                aria-label={`${label} — ${formatCurrency(member.price)}${
                  inStock ? "" : " (غير متوفر)"
                }`}
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
                {/*
                 * Image swatches, not colour dots. For appliances a photo of the
                 * actual finish reads far better than a hex chip — "استانلس" and
                 * "استانلس غامق" are nearly the same colour but obviously
                 * different products — and it needs no extra authoring. The hex
                 * chip is only a fallback for a variant with no image yet.
                 */}
                <span className="relative block h-14 w-full overflow-hidden rounded bg-surface-sunken">
                  {image ? (
                    <Img
                      src={image}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain p-0.5"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="block h-full w-full"
                      style={hex ? { backgroundColor: hex } : undefined}
                    />
                  )}
                </span>

                <span className="w-full truncate text-center text-[11px] leading-tight">
                  {label}
                </span>

                {!inStock && (
                  <span className="text-[10px] leading-none text-sale">
                    غير متوفر
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
