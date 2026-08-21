import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The single way to render money in this app. Egyptian pounds, Latin digits.
 *
 * Deliberately not `Intl.NumberFormat("ar-EG", { style: "currency" })`: that
 * emits Arabic-Indic digits (٣٬٥٠٠٫٠٠) and the ISO-ish "ج.م.‏" form, which
 * clashes with the Latin numerals every product surface already renders. The
 * storefront is Arabic but its numbers are Latin, so match that.
 *
 * `maximumFractionDigits: 2` drops the trailing .00 on whole prices — catalogue
 * prices are integers, order totals may not be, and both read correctly here.
 */
export function formatCurrency(amount: number) {
  return `${amount.toLocaleString("en-EG", { maximumFractionDigits: 2 })} ج.م`;
}

export function getYoutubeId(url: string | null | undefined) {
  if (!url) return null;

  // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
}
