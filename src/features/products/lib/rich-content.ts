/**
 * Legacy product description sanitizer.
 *
 * `products.description_ar` holds HTML typed by hand into the Supabase table
 * editor. Two problems it solves:
 *
 * 1. The authored markup carries Tailwind utility classes
 *    (`<div class="space-y-6">`, `<h2 class="text-2xl font-bold">`). Tailwind v4
 *    scans source files, not the database, so those classes were never compiled
 *    and do nothing — while still overriding nothing predictably. Stripping them
 *    loses no styling and lets the `.rich-content` stylesheet own the look.
 *
 * 2. It is injected with `dangerouslySetInnerHTML`. Stripping *every* attribute
 *    removes the entire attribute-based XSS surface (`onerror`, `href=
 *    "javascript:"`, `srcdoc`, …) rather than trying to filter attribute values.
 *
 * A survey of all 72 populated rows found only these tags in use:
 * br, div, h2, h3, li, p, span, strong — and no images, links, tables, inline
 * styles or event handlers. So a zero-attribute allowlist is lossless here.
 *
 * Import-free by design so it can be unit-tested with no mocks.
 */

/** Tags kept in the output. Everything else is unwrapped (inner text survives). */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

/** Elements whose *contents* must go too, not just their tags. */
const VOID_CONTENT_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "template",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "textarea",
  "select",
];

const SELF_CLOSING = new Set(["br", "hr"]);

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";

  let out = html;

  // 1. Drop dangerous elements together with everything inside them.
  for (const tag of VOID_CONTENT_TAGS) {
    out = out.replace(
      new RegExp(`<\\s*${tag}\\b[\\s\\S]*?<\\s*/\\s*${tag}\\s*>`, "gi"),
      "",
    );
    // ...and any unclosed/self-closed leftovers.
    out = out.replace(new RegExp(`<\\s*/?\\s*${tag}\\b[^>]*>`, "gi"), "");
  }

  // 2. Remove comments (can hide conditional-comment payloads).
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Rewrite every remaining tag: keep it only if allowed, and always drop
  //    all attributes. No attribute survives, so there is nothing to filter.
  out = out.replace(
    /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/)?\s*>/g,
    (_match, closing: string | undefined, rawTag: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (SELF_CLOSING.has(tag)) return closing ? "" : `<${tag} />`;
      return closing ? `</${tag}>` : `<${tag}>`;
    },
  );

  // 4. Collapse the empty wrappers left behind by unwrapped/attribute-stripped
  //    elements, so the stylesheet's `> * + *` spacing doesn't add phantom gaps.
  let previous: string;
  do {
    previous = out;
    out = out.replace(
      /<(div|span|p|strong|b|em|i|u)>\s*<\/\1>/g,
      "",
    );
  } while (out !== previous);

  return out.trim();
}

/**
 * True when the sanitized description has real text in it. Used to decide
 * whether to render the section at all — an empty heading over nothing is
 * worse than no section.
 */
export function hasRichContent(html: string | null | undefined): boolean {
  const sanitized = sanitizeRichHtml(html);
  if (!sanitized) return false;
  return sanitized.replace(/<[^>]*>/g, "").trim().length > 0;
}

/**
 * Plain-text excerpt for `<meta name="description">` and Open Graph.
 * The raw field is 3,000–6,000 characters of HTML, which made an unusable meta
 * description before.
 */
export function toPlainTextExcerpt(
  html: string | null | undefined,
  maxLength = 160,
): string {
  if (!html) return "";

  const text = sanitizeRichHtml(html)
    .replace(/<(br|\/p|\/div|\/li|\/h[2-6])\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    // Decode the few entities that realistically appear.
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;

  // Cut on a word boundary so the excerpt doesn't end mid-word.
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
}
