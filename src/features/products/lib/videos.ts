/**
 * `products.video_urls` is a jsonb **object** keyed by clip type
 * (`unboxing` / `features` / `troubleshooting`), and its column default is
 * `'{}'` — which is truthy in JavaScript. 65 of 75 rows hold exactly that.
 *
 * A naive truthiness check therefore reports "has videos" for almost every
 * product, and since `ProductVideos` renders nothing for an empty object the
 * result is a section heading over an empty body. This helper exists so the
 * caller can skip the section entirely.
 *
 * Import-free so it can be unit-tested with no mocks.
 */

export function countProductVideos(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;

  const values = Array.isArray(raw)
    ? raw
    : Object.values(raw as Record<string, unknown>);

  return values.filter((v) => typeof v === "string" && v.trim().length > 0)
    .length;
}

export function hasProductVideos(raw: unknown): boolean {
  return countProductVideos(raw) > 0;
}
