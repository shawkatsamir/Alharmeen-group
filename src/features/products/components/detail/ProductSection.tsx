import type { ReactNode } from "react";

interface ProductSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/**
 * Wrapper for the stacked sections of the detail page.
 *
 * Callers are expected to skip rendering entirely when they have no data —
 * this component never renders a heading over nothing, which is what the old
 * "التقييمات قريباً..." tabs did.
 */
export function ProductSection({ id, title, children }: ProductSectionProps) {
  return (
    <section
      id={id}
      // Clears both the sticky header and the anchor rail on jump.
      className="scroll-mt-[calc(var(--header-h)+4rem)] rounded-xl border border-border bg-surface-raised p-6 lg:p-8"
    >
      <h2 className="mb-6 border-r-4 border-primary pr-3 text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
