import { describe, expect, it } from "vitest";
import {
  collapseToRepresentatives,
  collapseVariants,
  describeVariant,
  hasVariantChoice,
  pickRepresentative,
  readAxisValue,
  readAxisValues,
  sortVariantMembers,
  type VariantMember,
} from "./variant-group";

/** Mirrors the real SJ-58C group: three finishes of one 450-litre fridge. */
function member(
  id: string,
  overrides: Partial<VariantMember> = {},
): VariantMember {
  return {
    id,
    group_id: null,
    is_group_primary: false,
    variant_values: null,
    price: 1000,
    ...overrides,
  };
}

const SJ58C = [
  member("bk", {
    group_id: "sj58c",
    is_group_primary: true,
    price: 31600,
    variant_values: { اللون: "أسود" },
  }),
  member("sl", {
    group_id: "sj58c",
    price: 29420,
    variant_values: { اللون: "سيلفر" },
  }),
  member("st", {
    group_id: "sj58c",
    price: 28000,
    variant_values: { اللون: "استانلس" },
  }),
];

describe("readAxisValue", () => {
  it("reads a string axis value", () => {
    expect(readAxisValue({ اللون: "أسود" }, "اللون")).toBe("أسود");
  });

  it("trims and treats blank as absent", () => {
    expect(readAxisValue({ اللون: "  أسود  " }, "اللون")).toBe("أسود");
    expect(readAxisValue({ اللون: "   " }, "اللون")).toBeNull();
  });

  it("survives the shapes Json legally allows", () => {
    // variant_values is typed Json, so a listing page must not explode on a row
    // written before the object CHECK constraint existed.
    expect(readAxisValue(null, "اللون")).toBeNull();
    expect(readAxisValue(undefined, "اللون")).toBeNull();
    expect(readAxisValue("أسود", "اللون")).toBeNull();
    expect(readAxisValue(42, "اللون")).toBeNull();
    expect(readAxisValue(["أسود"], "اللون")).toBeNull();
    expect(readAxisValue({ اللون: 5 }, "اللون")).toBeNull();
    expect(readAxisValue({ اللون: null }, "اللون")).toBeNull();
  });

  it("returns null for an axis the product does not carry", () => {
    expect(readAxisValue({ اللون: "أسود" }, "السعة")).toBeNull();
  });
});

describe("readAxisValues / describeVariant", () => {
  it("returns values in the group's declared axis order", () => {
    const values = { السعة: "450 لتر", اللون: "أسود" };
    expect(readAxisValues(values, ["اللون", "السعة"])).toEqual([
      "أسود",
      "450 لتر",
    ]);
    expect(readAxisValues(values, ["السعة", "اللون"])).toEqual([
      "450 لتر",
      "أسود",
    ]);
  });

  it("skips missing axes instead of emitting gaps", () => {
    expect(readAxisValues({ اللون: "أسود" }, ["اللون", "السعة"])).toEqual([
      "أسود",
    ]);
    expect(describeVariant({ اللون: "أسود" }, ["اللون", "السعة"])).toBe("أسود");
  });

  it("joins multiple axes for a label", () => {
    expect(
      describeVariant({ اللون: "أسود", السعة: "450 لتر" }, ["اللون", "السعة"]),
    ).toBe("أسود · 450 لتر");
    expect(describeVariant(null, ["اللون"])).toBe("");
  });
});

describe("sortVariantMembers / pickRepresentative", () => {
  it("puts the group primary first even when it is not cheapest", () => {
    // SJ-58C(BK) is the primary at 31,600. The remaining two then order by
    // price, so (ST) at 28,000 precedes (SL) at 29,420 — swatches read
    // cheapest-first after the primary, not in insertion order.
    expect(sortVariantMembers(SJ58C).map((m) => m.id)).toEqual([
      "bk",
      "st",
      "sl",
    ]);
    expect(pickRepresentative(SJ58C).id).toBe("bk");
  });

  it("falls back to the cheapest when no primary is present", () => {
    const noPrimary = SJ58C.filter((m) => !m.is_group_primary);
    expect(pickRepresentative(noPrimary).id).toBe("st");
  });

  it("is stable regardless of input order", () => {
    const forward = sortVariantMembers(SJ58C).map((m) => m.id);
    const reversed = sortVariantMembers([...SJ58C].reverse()).map((m) => m.id);
    expect(reversed).toEqual(forward);
  });

  it("breaks price ties by id so ISR regenerations do not reshuffle", () => {
    const tied = [
      member("b", { group_id: "g", price: 500 }),
      member("a", { group_id: "g", price: 500 }),
    ];
    expect(sortVariantMembers(tied).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("sorts a missing price last rather than treating it as free", () => {
    const mixed = [
      member("noprice", { group_id: "g", price: null }),
      member("cheap", { group_id: "g", price: 100 }),
    ];
    expect(sortVariantMembers(mixed).map((m) => m.id)).toEqual([
      "cheap",
      "noprice",
    ]);
  });

  it("does not mutate its input", () => {
    const input = [...SJ58C].reverse();
    const snapshot = input.map((m) => m.id);
    sortVariantMembers(input);
    expect(input.map((m) => m.id)).toEqual(snapshot);
  });
});

describe("collapseVariants", () => {
  it("collapses a group to one entry holding every member", () => {
    const result = collapseVariants(SJ58C);
    expect(result).toHaveLength(1);
    expect(result[0].groupId).toBe("sj58c");
    expect(result[0].representative.id).toBe("bk");
    expect(result[0].members.map((m) => m.id)).toEqual(["bk", "st", "sl"]);
  });

  it("passes ungrouped products through as groups of one", () => {
    const loose = [member("x"), member("y")];
    const result = collapseVariants(loose);
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.groupId === null)).toBe(true);
    expect(result.every((g) => g.members.length === 1)).toBe(true);
  });

  it("keeps each group at the position of its first member", () => {
    // The caller has already ordered by best-seller/price; collapsing must not
    // silently reorder the grid.
    const mixed = [
      member("solo1"),
      SJ58C[2], // st — first SJ-58C member seen
      member("solo2"),
      SJ58C[0], // bk
      SJ58C[1], // sl
      member("solo3"),
    ];
    const result = collapseVariants(mixed);
    expect(result.map((g) => g.representative.id)).toEqual([
      "solo1",
      "bk", // group sits where "st" appeared, but bk represents it
      "solo2",
      "solo3",
    ]);
  });

  it("handles several distinct groups", () => {
    const two = [
      member("a1", { group_id: "a", price: 10 }),
      member("b1", { group_id: "b", price: 20 }),
      member("a2", { group_id: "a", price: 5 }),
      member("b2", { group_id: "b", price: 30 }),
    ];
    const result = collapseVariants(two);
    expect(result.map((g) => g.groupId)).toEqual(["a", "b"]);
    expect(result.map((g) => g.representative.id)).toEqual(["a2", "b1"]);
  });

  it("returns the survivor when filtering left one member of a group", () => {
    // The price-filter case: only the silver variant is in range, so silver is
    // what the card must show — never the primary that the filter excluded.
    const survivors = [SJ58C[1]];
    const result = collapseVariants(survivors);
    expect(result).toHaveLength(1);
    expect(result[0].representative.id).toBe("sl");
    expect(hasVariantChoice(result[0].members)).toBe(false);
  });

  it("promotes the cheapest survivor when the primary was filtered out", () => {
    const survivors = [SJ58C[1], SJ58C[2]];
    const result = collapseVariants(survivors);
    expect(result[0].representative.id).toBe("st");
    expect(result[0].members).toHaveLength(2);
  });

  it("returns an empty array for empty input", () => {
    expect(collapseVariants([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const input = [...SJ58C];
    collapseVariants(input);
    expect(input.map((m) => m.id)).toEqual(["bk", "sl", "st"]);
  });
});

describe("collapseToRepresentatives", () => {
  it("returns one product per group, ordering preserved", () => {
    const mixed = [member("solo"), ...SJ58C];
    expect(collapseToRepresentatives(mixed).map((p) => p.id)).toEqual([
      "solo",
      "bk",
    ]);
  });
});

describe("hasVariantChoice", () => {
  it("is false for a lone product, so no selector and no ProductGroup", () => {
    expect(hasVariantChoice([member("only")])).toBe(false);
    expect(hasVariantChoice([])).toBe(false);
    expect(hasVariantChoice(SJ58C)).toBe(true);
  });
});
