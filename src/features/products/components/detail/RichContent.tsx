import { Img } from "@/shared/components/ui/Image";
import { Check } from "lucide-react";
import {
  parseContentBlocks,
  type ContentBlock,
} from "../../lib/content-blocks";
import { sanitizeRichHtml } from "../../lib/rich-content";

interface RichContentProps {
  /** `products.content_blocks` — preferred when present. */
  blocks: unknown;
  /** `products.description_ar` — legacy hand-typed HTML fallback. */
  legacyHtml: string | null | undefined;
}

/**
 * Renders long-form product content from whichever source exists:
 *
 *   content_blocks present -> typed React components (styling owned by code)
 *   otherwise              -> sanitized, class-stripped legacy HTML
 *   neither                -> nothing at all
 *
 * The legacy path keeps all 72 already-populated products working untouched
 * while the admin block editor is built.
 */
export function RichContent({ blocks, legacyHtml }: RichContentProps) {
  const parsed = parseContentBlocks(blocks);

  if (parsed.length > 0) {
    return (
      <div className="space-y-8">
        {parsed.map((block, i) => (
          <BlockRenderer key={i} block={block} index={i} />
        ))}
      </div>
    );
  }

  const sanitized = sanitizeRichHtml(legacyHtml);
  if (!sanitized) return null;

  return (
    <div
      className="rich-content"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

function BlockRenderer({
  block,
  index,
}: {
  block: ContentBlock;
  index: number;
}) {
  switch (block.type) {
    case "heading":
      return block.level === 3 ? (
        <h3 className="text-lg font-bold">{block.text}</h3>
      ) : (
        <h3 className="border-r-4 border-primary pr-3 text-xl font-bold">
          {block.text}
        </h3>
      );

    case "paragraph":
      return (
        <p className="leading-relaxed text-muted-foreground">{block.text}</p>
      );

    case "callout":
      return (
        <div className="rounded-lg border-r-4 border-accent bg-accent-soft p-4">
          {block.title && (
            <p className="mb-1 font-bold text-accent-foreground">
              {block.title}
            </p>
          )}
          <p className="text-sm text-accent-foreground/90">{block.text}</p>
        </div>
      );

    case "list":
      return (
        <div>
          {block.title && (
            <h3 className="mb-3 text-lg font-bold">{block.title}</h3>
          )}
          <ul className="grid gap-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "feature": {
      // Rows alternate sides unless the block pins one.
      const imageFirst =
        block.align === "start" || (!block.align && index % 2 === 1);
      return (
        <div className="grid items-center gap-6 md:grid-cols-2">
          {block.image && (
            <div
              className={`relative aspect-4/3 overflow-hidden rounded-xl bg-white ${
                imageFirst ? "md:order-first" : "md:order-last"
              }`}
            >
              <Img
                src={block.image}
                alt={block.imageAlt || block.title}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-contain p-4"
              />
            </div>
          )}
          <div>
            {block.title && (
              <h3 className="mb-2 text-lg font-bold">{block.title}</h3>
            )}
            {block.body && (
              <p className="leading-relaxed text-muted-foreground">
                {block.body}
              </p>
            )}
          </div>
        </div>
      );
    }

    case "feature_grid":
      return (
        <div>
          {block.title && (
            <h3 className="mb-4 text-lg font-bold">{block.title}</h3>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {block.items.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface-sunken p-4"
              >
                {item.image && (
                  <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-white">
                    <Img
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-contain p-2"
                    />
                  </div>
                )}
                <p className="font-semibold">{item.title}</p>
                {item.body && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "image":
      return (
        <figure>
          <div className="relative aspect-16/9 overflow-hidden rounded-xl bg-white">
            <Img
              src={block.url}
              alt={block.alt || ""}
              fill
              sizes="(max-width: 1024px) 100vw, 800px"
              className="object-contain p-4"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "gallery":
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {block.images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-xl bg-white"
            >
              <Img
                src={img.url}
                alt={img.alt || ""}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-contain p-3"
              />
            </div>
          ))}
        </div>
      );

    case "spec_highlight":
      return (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl bg-primary-soft px-4 py-3 text-center"
            >
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 text-lg font-bold text-primary">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      );

    case "video":
      return (
        <figure>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              src={block.url}
              title={block.title || "فيديو المنتج"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full"
            />
          </div>
          {block.title && (
            <figcaption className="mt-2 text-sm text-muted-foreground">
              {block.title}
            </figcaption>
          )}
        </figure>
      );
  }
}
