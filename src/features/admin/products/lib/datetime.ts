/**
 * `<input type="datetime-local">` <-> `timestamptz` conversion.
 *
 * The input reads and writes `YYYY-MM-DDTHH:mm` in the browser's local time with
 * no zone attached, while `products.sale_end_date` is `timestamptz`. Feeding an
 * ISO string with a `Z` suffix straight into the input silently blanks it, and
 * storing the raw input value makes the offer expire at the wrong moment for
 * anyone in a different zone.
 *
 * Import-free by design so it can be unit-tested with no mocks.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** `timestamptz` -> the value a datetime-local input expects (local time). */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** datetime-local value -> an ISO instant, or null when blank/unparseable. */
export function fromDateTimeLocal(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // `new Date("2026-09-01T12:00")` is parsed as local time, which is what the
  // input means. Appending a zone here would shift it.
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}
