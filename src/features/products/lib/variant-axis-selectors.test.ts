import { describe, expect, it } from "vitest";
import {
  buildAxisSelectors,
  sortVariantMembers,
  type VariantMember,
} from "./variant-group";

/*
 * Its own file rather than more blocks in variant-group.test.ts: the per-axis
 * selector is the largest piece of logic in the module and carries the two
 * invariants the whole feature rests on — every option links somewhere, and a
 * one-axis row never reorders.
 */

const COLOUR = "اللون";
const SIZE = "المقاس";

function member(
  id: string,
  overrides: Partial<VariantMember> = {},
): VariantMember {
  return {
    id,
    group_id: "g",
    is_group_primary: false,
    variant_values: null,
    price: 1000,
    ...overrides,
  };
}

/** Mirrors the shipped SJ-58C group: one axis, three finishes. */
const SJ58C = [
  member("bk", {
    group_id: "sj58c",
    is_group_primary: true,
    price: 31600,
    variant_values: { [COLOUR]: "أسود" },
  }),
  member("sl", {
    group_id: "sj58c",
    price: 29420,
    variant_values: { [COLOUR]: "سيلفر" },
  }),
  member("st", {
    group_id: "sj58c",
    price: 28000,
    variant_values: { [COLOUR]: "استانلس" },
  }),
];

function tv(id: string, colour: string, size: string, price: number): VariantMember {
  return member(id, {
    group_id: "tv",
    price,
    variant_values: { [COLOUR]: colour, [SIZE]: size },
  });
}

/** Full 2x2: two colours by two sizes. */
const TV_FULL = [
  tv("bk43", "أسود", "43 بوصة", 12000),
  tv("sl43", "سيلفر", "43 بوصة", 12500),
  tv("bk55", "أسود", "55 بوصة", 18000),
  tv("sl55", "سيلفر", "55 بوصة", 18500),
];

/** Sparse: سيلفر exists only at 43, أسود only at 55. */
const TV_SPARSE = [
  tv("bk55", "أسود", "55 بوصة", 18000),
  tv("sl43", "سيلفر", "43 بوصة", 12500),
];

/** Numeric ordering, mirroring axisValueRank without importing the registry. */
const sizeRank = (axis: string, value: string) =>
  axis === SIZE ? Number(value.match(/\d+/)?.[0] ?? NaN) : null;

describe("buildAxisSelectors — degenerate one-axis case", () => {
  it("orders a one-axis row exactly like sortVariantMembers", () => {
    /*
     * THE REGRESSION LOCK. The colour row for SJ-58C already ships. If option
     * order stopped tracking member order, that statically generated page would
     * silently reshuffle on its next ISR regeneration.
     */
    const [row] = buildAxisSelectors(SJ58C, [COLOUR], "bk");
    const expected = sortVariantMembers(SJ58C).map(
      (m) => (m.variant_values as Record<string, string>)[COLOUR],
    );
    expect(row.options.map((o) => o.value)).toEqual(expected);
  });

  it("returns one selector for a one-axis group", () => {
    expect(buildAxisSelectors(SJ58C, [COLOUR], "bk")).toHaveLength(1);
  });

  it("marks every option exact when there is only one axis", () => {
    const [row] = buildAxisSelectors(SJ58C, [COLOUR], "bk");
    expect(row.options.every((o) => o.isExact)).toBe(true);
  });

  it("self-links the active option", () => {
    const [row] = buildAxisSelectors(SJ58C, [COLOUR], "bk");
    expect(row.options.find((o) => o.isActive)?.target.id).toBe("bk");
    expect(row.activeValue).toBe("أسود");
  });

  it("returns an empty array when there is nothing to choose between", () => {
    expect(buildAxisSelectors([SJ58C[0]], [COLOUR], "bk")).toEqual([]);
    expect(buildAxisSelectors([], [COLOUR], "bk")).toEqual([]);
    expect(buildAxisSelectors(SJ58C, [], "bk")).toEqual([]);
  });

  it("omits an axis whose value is constant across the group", () => {
    const sameColour = [
      member("a", { price: 1, variant_values: { [COLOUR]: "أسود" } }),
      member("b", { price: 2, variant_values: { [COLOUR]: "أسود" } }),
    ];
    expect(buildAxisSelectors(sameColour, [COLOUR], "a")).toEqual([]);
  });
});

describe("buildAxisSelectors — multi-axis", () => {
  it("returns one selector per axis in the declared order", () => {
    const rows = buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "bk43");
    expect(rows.map((r) => r.axis)).toEqual([COLOUR, SIZE]);
  });

  it("links each option to the member that changes only that axis", () => {
    const [colours, sizes] = buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "bk43");
    expect(colours.options.find((o) => o.value === "سيلفر")?.target.id).toBe("sl43");
    expect(sizes.options.find((o) => o.value === "55 بوصة")?.target.id).toBe("bk55");
  });

  it("marks the active value on every axis row", () => {
    const rows = buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "sl55");
    expect(rows[0].activeValue).toBe("سيلفر");
    expect(rows[1].activeValue).toBe("55 بوصة");
    expect(rows.every((r) => r.options.some((o) => o.isActive))).toBe(true);
  });

  it("marks every option exact when the matrix is full", () => {
    const rows = buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "bk43");
    expect(rows.every((r) => r.options.every((o) => o.isExact))).toBe(true);
  });
});

describe("buildAxisSelectors — sparse matrices", () => {
  it("links a missing combination to the nearest member, never a dead option", () => {
    const [colours] = buildAxisSelectors(TV_SPARSE, [COLOUR, SIZE], "bk55");
    const silver = colours.options.find((o) => o.value === "سيلفر");
    expect(silver?.target.id).toBe("sl43");
    expect(silver?.isExact).toBe(false);
  });

  it("never returns an option without a target", () => {
    // The SEO invariant, asserted across every fixture and every active member.
    for (const fixture of [SJ58C, TV_FULL, TV_SPARSE]) {
      for (const activeId of fixture.map((m) => m.id)) {
        for (const row of buildAxisSelectors(fixture, [COLOUR, SIZE], activeId)) {
          for (const option of row.options) {
            expect(option.target).toBeDefined();
            expect(option.target.id).toBeTruthy();
          }
        }
      }
    }
  });

  it("prefers a candidate agreeing on more of the other axes", () => {
    const cube = [
      tv("a", "أسود", "43 بوصة", 100),
      tv("b", "سيلفر", "43 بوصة", 200),
      tv("c", "سيلفر", "55 بوصة", 50),
    ];
    // From أسود/43, switching colour keeps 43 even though c is cheaper.
    const [colours] = buildAxisSelectors(cube, [COLOUR, SIZE], "a");
    expect(colours.options.find((o) => o.value === "سيلفر")?.target.id).toBe("b");
  });

  it("falls back to the cheapest candidate when no other axis agrees", () => {
    const cube = [
      tv("a", "أسود", "43 بوصة", 100),
      tv("dear", "سيلفر", "55 بوصة", 900),
      tv("cheap", "سيلفر", "65 بوصة", 300),
    ];
    const [colours] = buildAxisSelectors(cube, [COLOUR, SIZE], "a");
    expect(colours.options.find((o) => o.value === "سيلفر")?.target.id).toBe("cheap");
  });

  it("prefers the group primary over a cheaper candidate at equal distance", () => {
    const cube = [
      tv("a", "أسود", "43 بوصة", 100),
      member("primary", {
        group_id: "tv",
        is_group_primary: true,
        price: 900,
        variant_values: { [COLOUR]: "سيلفر", [SIZE]: "55 بوصة" },
      }),
      tv("cheap", "سيلفر", "65 بوصة", 300),
    ];
    const [colours] = buildAxisSelectors(cube, [COLOUR, SIZE], "a");
    expect(colours.options.find((o) => o.value === "سيلفر")?.target.id).toBe("primary");
  });

  it("handles a three-axis matrix with most combinations missing", () => {
    const DEPTH = "العمق";
    const cube = [
      member("a", {
        price: 100,
        variant_values: { [COLOUR]: "أسود", [SIZE]: "43 بوصة", [DEPTH]: "عميق" },
      }),
      member("b", {
        price: 200,
        variant_values: { [COLOUR]: "سيلفر", [SIZE]: "55 بوصة", [DEPTH]: "ضحل" },
      }),
      member("c", {
        price: 300,
        variant_values: { [COLOUR]: "أبيض", [SIZE]: "65 بوصة", [DEPTH]: "عميق" },
      }),
    ];
    const rows = buildAxisSelectors(cube, [COLOUR, SIZE, DEPTH], "a");
    expect(rows.map((r) => r.axis)).toEqual([COLOUR, SIZE, DEPTH]);
    expect(rows.every((r) => r.options.every((o) => o.target))).toBe(true);
    // From a, switching depth to ضحل has no أسود/43 match, so it is inexact.
    const depth = rows[2].options.find((o) => o.value === "ضحل");
    expect(depth?.isExact).toBe(false);
    expect(depth?.target.id).toBe("b");
  });
});

describe("buildAxisSelectors — missing and malformed values", () => {
  it("omits a member with no value for an axis from that axis's options", () => {
    const mixed = [
      tv("full", "أسود", "43 بوصة", 100),
      member("nosize", {
        group_id: "tv",
        price: 200,
        variant_values: { [COLOUR]: "سيلفر" },
      }),
      tv("other", "أبيض", "55 بوصة", 300),
    ];
    const [colours, sizes] = buildAxisSelectors(mixed, [COLOUR, SIZE], "full");
    // It still offers its colour...
    expect(colours.options.map((o) => o.value)).toContain("سيلفر");
    // ...but contributes no size option.
    expect(sizes.options.map((o) => o.target.id)).not.toContain("nosize");
  });

  it("reports a null activeValue when the active member carries no value", () => {
    const mixed = [
      member("active", { price: 1, variant_values: { [COLOUR]: "أسود" } }),
      member("b", {
        price: 2,
        variant_values: { [COLOUR]: "سيلفر", [SIZE]: "43 بوصة" },
      }),
      member("c", {
        price: 3,
        variant_values: { [COLOUR]: "أبيض", [SIZE]: "55 بوصة" },
      }),
    ];
    const sizeRow = buildAxisSelectors(mixed, [COLOUR, SIZE], "active").find(
      (r) => r.axis === SIZE,
    );
    expect(sizeRow?.activeValue).toBeNull();
    expect(sizeRow?.options.some((o) => o.isActive)).toBe(false);
    expect(sizeRow?.options.every((o) => o.target)).toBe(true);
  });

  it("ignores an axis key present in variant_values but not declared", () => {
    const rows = buildAxisSelectors(TV_FULL, [COLOUR], "bk43");
    expect(rows).toHaveLength(1);
    expect(rows[0].axis).toBe(COLOUR);
  });

  it("survives the shapes Json legally allows", () => {
    const junk = [
      member("a", { price: 1, variant_values: "أسود" }),
      member("b", { price: 2, variant_values: ["سيلفر"] }),
      member("c", { price: 3, variant_values: null }),
    ];
    expect(() => buildAxisSelectors(junk, [COLOUR], "a")).not.toThrow();
    expect(buildAxisSelectors(junk, [COLOUR], "a")).toEqual([]);
  });

  it("treats a blank axis value as absent", () => {
    const blanks = [
      member("a", { price: 1, variant_values: { [COLOUR]: "   " } }),
      member("b", { price: 2, variant_values: { [COLOUR]: "أسود" } }),
      member("c", { price: 3, variant_values: { [COLOUR]: "سيلفر" } }),
    ];
    const [row] = buildAxisSelectors(blanks, [COLOUR], "b");
    // The blank member contributes no option; the other two keep member order
    // (cheapest first), so أسود at 2 precedes سيلفر at 3.
    expect(row.options.map((o) => o.value)).toEqual(["أسود", "سيلفر"]);
    expect(row.options.map((o) => o.target.id)).not.toContain("a");
  });

  it("handles an activeId that is not in members", () => {
    const rows = buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "ghost");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.activeValue === null)).toBe(true);
    expect(
      rows.every((r) => r.options.every((o) => !o.isActive && !o.isExact)),
    ).toBe(true);
    expect(rows.every((r) => r.options.every((o) => o.target))).toBe(true);
  });
});

describe("buildAxisSelectors — hooks", () => {
  it("collapses two spellings of one value into a single option", () => {
    const drifted = [
      tv("a", "أسود", "43 بوصة", 100),
      tv("b", "اسود", "55 بوصة", 200),
      tv("c", "سيلفر", "43 بوصة", 300),
    ];
    const normalize = (_axis: string, value: string) => value.replace(/أ/g, "ا").trim();
    const [colours] = buildAxisSelectors(drifted, [COLOUR, SIZE], "a", { normalize });
    expect(colours.options).toHaveLength(2);
    // Display spelling comes from the first member in canonical order.
    expect(colours.options.map((o) => o.value)).toContain("أسود");
  });

  it("uses identity normalisation when no hook is supplied", () => {
    const drifted = [
      tv("a", "أسود", "43 بوصة", 100),
      tv("b", "اسود", "55 بوصة", 200),
    ];
    expect(buildAxisSelectors(drifted, [COLOUR, SIZE], "a")[0].options).toHaveLength(2);
  });

  it("sorts a ranked axis numerically, not lexicographically", () => {
    const sizes = [
      tv("a", "أسود", "100 بوصة", 100),
      tv("b", "أسود", "43 بوصة", 200),
      tv("c", "أسود", "55 بوصة", 300),
    ];
    const [row] = buildAxisSelectors(sizes, [SIZE], "b", { rank: sizeRank });
    expect(row.options.map((o) => o.value)).toEqual([
      "43 بوصة",
      "55 بوصة",
      "100 بوصة",
    ]);
  });

  it("appends unranked values after ranked ones", () => {
    const sizes = [
      tv("big", "أسود", "كبير", 100),
      tv("a", "أسود", "55 بوصة", 200),
      tv("b", "أسود", "43 بوصة", 300),
    ];
    const [row] = buildAxisSelectors(sizes, [SIZE], "a", { rank: sizeRank });
    expect(row.options.map((o) => o.value)).toEqual(["43 بوصة", "55 بوصة", "كبير"]);
  });

  it("breaks a rank tie deterministically", () => {
    // Real live data: SJ-58C(BK) says "450" while (ST) says "450 لتر".
    const tied = [
      tv("bare", "أسود", "450", 100),
      tv("unit", "سيلفر", "450 لتر", 200),
      tv("other", "أبيض", "396 لتر", 300),
    ];
    const first = buildAxisSelectors(tied, [SIZE], "bare", { rank: sizeRank });
    const second = buildAxisSelectors([...tied].reverse(), [SIZE], "bare", {
      rank: sizeRank,
    });
    expect(second[0].options.map((o) => o.value)).toEqual(
      first[0].options.map((o) => o.value),
    );
  });

  it("ignores a rank hook returning NaN or Infinity", () => {
    expect(
      buildAxisSelectors(TV_FULL, [SIZE], "bk43", { rank: () => Number.NaN })[0]
        .options,
    ).toHaveLength(2);
    expect(
      buildAxisSelectors(TV_FULL, [SIZE], "bk43", {
        rank: () => Number.POSITIVE_INFINITY,
      })[0].options,
    ).toHaveLength(2);
  });
});

describe("buildAxisSelectors — determinism", () => {
  it("is stable regardless of input member order", () => {
    const forward = buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "bk43");
    const reversed = buildAxisSelectors([...TV_FULL].reverse(), [COLOUR, SIZE], "bk43");
    expect(reversed.map((r) => r.options.map((o) => o.value))).toEqual(
      forward.map((r) => r.options.map((o) => o.value)),
    );
    expect(reversed.map((r) => r.options.map((o) => o.target.id))).toEqual(
      forward.map((r) => r.options.map((o) => o.target.id)),
    );
  });

  it("is stable when every member ties on price with no primary", () => {
    const tied = [
      tv("c", "أبيض", "43 بوصة", 100),
      tv("a", "أسود", "43 بوصة", 100),
      tv("b", "سيلفر", "43 بوصة", 100),
    ];
    const first = buildAxisSelectors(tied, [COLOUR], "a");
    const second = buildAxisSelectors([...tied].reverse(), [COLOUR], "a");
    expect(second[0].options.map((o) => o.value)).toEqual(
      first[0].options.map((o) => o.value),
    );
  });

  it("does not mutate its inputs", () => {
    const snapshot = TV_FULL.map((m) => m.id);
    buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "bk43");
    expect(TV_FULL.map((m) => m.id)).toEqual(snapshot);
  });

  it("does not depend on jsonb key order", () => {
    const flipped = TV_FULL.map((m) => {
      const v = m.variant_values as Record<string, string>;
      return { ...m, variant_values: { [SIZE]: v[SIZE], [COLOUR]: v[COLOUR] } };
    });
    expect(
      buildAxisSelectors(flipped, [COLOUR, SIZE], "bk43").map((r) =>
        r.options.map((o) => o.value),
      ),
    ).toEqual(
      buildAxisSelectors(TV_FULL, [COLOUR, SIZE], "bk43").map((r) =>
        r.options.map((o) => o.value),
      ),
    );
  });

  it("never returns two options with the same key on one row", () => {
    for (const fixture of [SJ58C, TV_FULL, TV_SPARSE]) {
      for (const row of buildAxisSelectors(fixture, [COLOUR, SIZE], fixture[0].id)) {
        const keys = row.options.map((o) => o.key);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });
});
