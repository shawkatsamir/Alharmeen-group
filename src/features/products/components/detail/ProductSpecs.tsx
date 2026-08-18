"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { countSpecs, type SpecGroup } from "../../lib/specifications";

/** Past this many rows the table collapses behind a "show all" toggle. */
const COLLAPSE_THRESHOLD = 12;

export function ProductSpecs({ groups }: { groups: SpecGroup[] }) {
  const total = countSpecs(groups);
  const collapsible = total > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!collapsible);

  // Callers already skip rendering when there is nothing, but stay defensive.
  if (groups.length === 0) return null;

  let rendered = 0;
  const visibleGroups: SpecGroup[] = [];
  for (const group of groups) {
    if (expanded) {
      visibleGroups.push(group);
      continue;
    }
    if (rendered >= COLLAPSE_THRESHOLD) break;
    const remaining = COLLAPSE_THRESHOLD - rendered;
    visibleGroups.push({ ...group, entries: group.entries.slice(0, remaining) });
    rendered += Math.min(group.entries.length, remaining);
  }

  return (
    <div className="space-y-6">
      <div
        className={
          collapsible && !expanded
            ? "relative max-h-[32rem] overflow-hidden"
            : undefined
        }
      >
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <section key={group.id}>
              <h3 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <dl className="overflow-hidden rounded-lg border border-border">
                {group.entries.map((entry, i) => (
                  <div
                    key={entry.key}
                    className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] ${
                      i % 2 === 1 ? "bg-surface-sunken" : "bg-surface-raised"
                    }`}
                  >
                    <dt className="font-semibold text-foreground">
                      {entry.label}
                    </dt>
                    <dd className="text-muted-foreground">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        {collapsible && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-surface to-transparent" />
        )}
      </div>

      {collapsible && (
        <Button
          variant="outline"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full sm:w-auto"
        >
          {expanded ? "عرض أقل" : `عرض كل المواصفات (${total})`}
          <ChevronDown
            className={`mr-2 h-4 w-4 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </Button>
      )}
    </div>
  );
}
