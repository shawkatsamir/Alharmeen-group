import { describe, expect, it } from "vitest";
import { countProductVideos, hasProductVideos } from "./videos";

describe("hasProductVideos", () => {
  it("is false for the column default `{}` — the case that caused an empty section", () => {
    // 65 of 75 catalog rows hold exactly this, and `{}` is truthy in JS.
    expect(hasProductVideos({})).toBe(false);
  });

  it("is false for nullish and non-object input", () => {
    expect(hasProductVideos(null)).toBe(false);
    expect(hasProductVideos(undefined)).toBe(false);
    expect(hasProductVideos("https://youtu.be/x")).toBe(false);
    expect(hasProductVideos(0)).toBe(false);
  });

  it("is true for a populated video object", () => {
    expect(
      hasProductVideos({
        features: "https://youtu.be/GOnVBEcqhJ8",
        unboxing: "https://youtu.be/aejJVx6syMQ",
        troubleshooting: "https://youtu.be/InCqUis_1YI",
      }),
    ).toBe(true);
  });

  it("ignores blank and non-string values", () => {
    expect(hasProductVideos({ unboxing: "", features: "   " })).toBe(false);
    expect(hasProductVideos({ unboxing: null, features: 42 })).toBe(false);
    expect(hasProductVideos({ unboxing: "", features: "https://y" })).toBe(true);
  });

  it("also handles an array shape", () => {
    expect(hasProductVideos([])).toBe(false);
    expect(hasProductVideos(["https://youtu.be/x"])).toBe(true);
  });
});

describe("countProductVideos", () => {
  it("counts only usable URLs", () => {
    expect(countProductVideos({})).toBe(0);
    expect(
      countProductVideos({ a: "x", b: "", c: "y", d: null }),
    ).toBe(2);
  });
});
