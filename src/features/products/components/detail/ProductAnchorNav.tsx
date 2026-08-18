"use client";

interface Anchor {
  id: string;
  label: string;
}

/**
 * Replaces the old tab strip. Tabs hid 3,000+ characters of Arabic copy from
 * crawlers and forced the "empty tab" problem; a single scrolling page with
 * anchors keeps everything in the document.
 *
 * Only receives anchors for sections that actually rendered, so it never links
 * to a section that isn't there.
 */
export function ProductAnchorNav({ anchors }: { anchors: Anchor[] }) {
  // One section doesn't justify a nav.
  if (anchors.length < 2) return null;

  return (
    <nav
      aria-label="أقسام صفحة المنتج"
      className="no-scrollbar sticky top-[var(--header-h)] z-30 -mx-4 flex gap-1 overflow-x-auto border-b border-border bg-surface/95 px-4 py-2 backdrop-blur lg:mx-0 lg:rounded-xl lg:border lg:px-3"
    >
      {anchors.map((anchor) => (
        <a
          key={anchor.id}
          href={`#${anchor.id}`}
          className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
        >
          {anchor.label}
        </a>
      ))}
    </nav>
  );
}
