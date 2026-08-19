/**
 * Structured product content.
 *
 * `products.content_blocks` replaces hand-typed HTML in `description_ar`. The
 * store owner authors blocks (Phase B admin editor); React owns the styling, so
 * content can never again ship uncompiled Tailwind classes or raw markup.
 *
 * Parsing is defensive on purpose: the column is plain jsonb with no database
 * constraint, so a malformed or partially-authored block must be skipped rather
 * than crash a statically-generated product page.
 *
 * Import-free so it can be unit-tested with no mocks.
 */

export interface FeatureGridItem {
  title: string;
  body?: string;
  image?: string;
}

export interface GalleryImage {
  url: string;
  alt?: string;
}

export interface SpecHighlightItem {
  label: string;
  value: string;
}

export type ContentBlock =
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "callout"; text: string; title?: string }
  | { type: "list"; items: string[]; title?: string }
  | {
      type: "feature";
      title: string;
      body?: string;
      image?: string;
      imageAlt?: string;
      /** Which side the image sits on for this row. Defaults to alternating. */
      align?: "start" | "end";
    }
  | { type: "feature_grid"; title?: string; items: FeatureGridItem[] }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "gallery"; images: GalleryImage[] }
  | { type: "spec_highlight"; items: SpecHighlightItem[] }
  | { type: "video"; url: string; title?: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter((s): s is string => Boolean(s)) : [];

/**
 * Validate one raw block. Returns `null` when the block is unusable — an empty
 * heading or an image with no URL renders as a visual hole, so it is dropped.
 */
function parseBlock(raw: unknown): ContentBlock | null {
  if (!isRecord(raw)) return null;
  const type = str(raw.type);
  if (!type) return null;

  switch (type) {
    case "heading": {
      const text = str(raw.text);
      if (!text) return null;
      const level = raw.level === 3 ? 3 : 2;
      return { type: "heading", text, level };
    }
    case "paragraph": {
      const text = str(raw.text);
      return text ? { type: "paragraph", text } : null;
    }
    case "callout": {
      const text = str(raw.text);
      return text ? { type: "callout", text, title: str(raw.title) } : null;
    }
    case "list": {
      const items = strArray(raw.items);
      return items.length > 0
        ? { type: "list", items, title: str(raw.title) }
        : null;
    }
    case "feature": {
      const title = str(raw.title);
      const body = str(raw.body);
      // A feature with neither a title nor a body has nothing to show.
      if (!title && !body) return null;
      const align = raw.align === "end" ? "end" : raw.align === "start" ? "start" : undefined;
      return {
        type: "feature",
        title: title ?? "",
        body,
        image: str(raw.image),
        imageAlt: str(raw.imageAlt),
        align,
      };
    }
    case "feature_grid": {
      const items = Array.isArray(raw.items)
        ? raw.items
            .map((item): FeatureGridItem | null => {
              if (!isRecord(item)) return null;
              const title = str(item.title);
              if (!title) return null;
              return { title, body: str(item.body), image: str(item.image) };
            })
            .filter((i): i is FeatureGridItem => i !== null)
        : [];
      return items.length > 0
        ? { type: "feature_grid", title: str(raw.title), items }
        : null;
    }
    case "image": {
      const url = str(raw.url);
      return url
        ? { type: "image", url, alt: str(raw.alt), caption: str(raw.caption) }
        : null;
    }
    case "gallery": {
      const images = Array.isArray(raw.images)
        ? raw.images
            .map((img): GalleryImage | null => {
              if (!isRecord(img)) return null;
              const url = str(img.url);
              return url ? { url, alt: str(img.alt) } : null;
            })
            .filter((i): i is GalleryImage => i !== null)
        : [];
      return images.length > 0 ? { type: "gallery", images } : null;
    }
    case "spec_highlight": {
      const items = Array.isArray(raw.items)
        ? raw.items
            .map((item): SpecHighlightItem | null => {
              if (!isRecord(item)) return null;
              const label = str(item.label);
              const value = str(item.value);
              return label && value ? { label, value } : null;
            })
            .filter((i): i is SpecHighlightItem => i !== null)
        : [];
      return items.length > 0 ? { type: "spec_highlight", items } : null;
    }
    case "video": {
      const url = str(raw.url);
      return url ? { type: "video", url, title: str(raw.title) } : null;
    }
    default:
      // Unknown block type from a newer admin build — ignore rather than crash.
      return null;
  }
}

/**
 * Parse the raw `content_blocks` column into renderable blocks.
 * Returns `[]` for null / non-array / all-invalid input so the caller can skip
 * the section entirely.
 */
export function parseContentBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseBlock)
    .filter((b): b is ContentBlock => b !== null);
}

export function hasContentBlocks(raw: unknown): boolean {
  return parseContentBlocks(raw).length > 0;
}

/**
 * Flatten the authored copy into plain text.
 *
 * Products created through the admin editor have no `description_ar` at all, so
 * the `<meta name="description">` chain would fall straight through to the
 * generic "تسوق … بأفضل الأسعار" string. Pulling the prose out of the blocks
 * gives those products a real description without asking the author to write
 * one twice.
 *
 * Only prose-bearing fields are included — a bare URL or an image alt would make
 * a worse snippet than none.
 */
export function contentBlocksToPlainText(raw: unknown): string {
  const parts: string[] = [];

  for (const block of parseContentBlocks(raw)) {
    switch (block.type) {
      case "heading":
      case "paragraph":
        parts.push(block.text);
        break;
      case "callout":
        if (block.title) parts.push(block.title);
        parts.push(block.text);
        break;
      case "list":
        if (block.title) parts.push(block.title);
        parts.push(block.items.join("، "));
        break;
      case "feature":
        if (block.title) parts.push(block.title);
        if (block.body) parts.push(block.body);
        break;
      case "feature_grid":
        if (block.title) parts.push(block.title);
        for (const item of block.items) {
          parts.push(item.body ? `${item.title}: ${item.body}` : item.title);
        }
        break;
      case "spec_highlight":
        parts.push(
          block.items.map((item) => `${item.label}: ${item.value}`).join("، "),
        );
        break;
      case "image":
        if (block.caption) parts.push(block.caption);
        break;
      case "video":
      case "gallery":
        break;
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
