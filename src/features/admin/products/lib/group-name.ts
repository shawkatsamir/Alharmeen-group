/**
 * Seed a variant group's name from one of its products.
 *
 * Lives here rather than beside the actions because a `"use server"` module may
 * only export async functions, and because this is pure logic worth testing on
 * its own.
 */

/**
 * Strip the product's SKU from either end of its name.
 *
 * Names in this catalogue mostly END with their SKU
 * ("ثلاجة شارب نوفروست 450 لتر أسود SJ-58C(BK)") but some LEAD with it
 * ("EG0P042MX-S ميكروويف ميديا 32 لتر بشواية"), and the first version of this
 * only handled the trailing case — which is how a live group ended up named
 * after a SKU.
 *
 * The varying value (a colour, a size) is deliberately NOT stripped. Guessing
 * which word is the axis value is exactly the kind of heuristic that mis-groups
 * products; the result only seeds an editable field, so the admin deletes it in
 * the form. A slightly long group name is cosmetic — a wrongly grouped product
 * is not.
 */
export function deriveGroupName(nameAr: string, sku: string): string {
  const name = (nameAr ?? "").replace(/\s+/g, " ").trim();
  const code = (sku ?? "").replace(/\s+/g, " ").trim();
  if (!code) return name;

  let out = name;
  if (out.endsWith(code)) out = out.slice(0, -code.length);
  else if (out.startsWith(code)) out = out.slice(code.length);

  const cleaned = out
    .replace(/\s+/g, " ")
    .replace(/^[-–—\s]+|[-–—\s]+$/g, "")
    .trim();

  // Never return an empty name — a product whose name IS its SKU keeps it.
  return cleaned || name;
}
