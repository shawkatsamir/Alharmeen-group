import { describe, expect, it } from "vitest";
import { fromDateTimeLocal, toDateTimeLocal } from "./datetime";

describe("toDateTimeLocal", () => {
  it("is blank for nullish or unparseable input, so the input stays empty", () => {
    expect(toDateTimeLocal(null)).toBe("");
    expect(toDateTimeLocal(undefined)).toBe("");
    expect(toDateTimeLocal("")).toBe("");
    expect(toDateTimeLocal("not a date")).toBe("");
  });

  it("produces the zero-padded shape the input requires", () => {
    // Built from local parts so the assertion holds in any test timezone.
    const local = new Date(2026, 8, 1, 9, 5);
    expect(toDateTimeLocal(local.toISOString())).toBe("2026-09-01T09:05");
  });

  it("has no seconds or zone suffix, which would blank the input", () => {
    const value = toDateTimeLocal(new Date(2026, 0, 2, 3, 4).toISOString());
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("fromDateTimeLocal", () => {
  it("is null for blank input, matching an open-ended offer", () => {
    expect(fromDateTimeLocal(null)).toBeNull();
    expect(fromDateTimeLocal(undefined)).toBeNull();
    expect(fromDateTimeLocal("   ")).toBeNull();
  });

  it("is null rather than Invalid Date for unparseable input", () => {
    expect(fromDateTimeLocal("not a date")).toBeNull();
  });

  it("interprets the value in the author's timezone", () => {
    // Postgres would read a bare "2026-09-01T12:00" as UTC; anchoring it here is
    // what stops the offer expiring at the wrong moment.
    expect(fromDateTimeLocal("2026-09-01T12:00")).toBe(
      new Date(2026, 8, 1, 12, 0).toISOString(),
    );
  });

  it("round-trips through toDateTimeLocal without drifting", () => {
    const original = "2026-09-01T12:30";
    expect(toDateTimeLocal(fromDateTimeLocal(original))).toBe(original);
  });
});
