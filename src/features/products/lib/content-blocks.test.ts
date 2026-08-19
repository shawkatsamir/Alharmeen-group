import { describe, expect, it } from "vitest";
import {
  contentBlocksToPlainText,
  hasContentBlocks,
  parseContentBlocks,
} from "./content-blocks";

describe("parseContentBlocks", () => {
  it("returns [] for the shapes the column can legitimately hold", () => {
    // The column is nullable and NULL means "fall back to description_ar".
    expect(parseContentBlocks(null)).toEqual([]);
    expect(parseContentBlocks(undefined)).toEqual([]);
    expect(parseContentBlocks([])).toEqual([]);
  });

  it("returns [] rather than throwing for non-array input", () => {
    // A check constraint enforces the array shape, but the parser predates it
    // and still guards a statically-generated page against bad data.
    expect(parseContentBlocks({ type: "heading", text: "x" })).toEqual([]);
    expect(parseContentBlocks("heading")).toEqual([]);
    expect(parseContentBlocks(42)).toEqual([]);
  });

  it("drops malformed entries instead of failing the whole page", () => {
    expect(
      parseContentBlocks([
        null,
        "not a block",
        { text: "no type" },
        { type: "" },
        { type: "heading", text: "صالح" },
      ]),
    ).toEqual([{ type: "heading", text: "صالح", level: 2 }]);
  });

  it("ignores an unknown block type from a newer admin build", () => {
    expect(
      parseContentBlocks([{ type: "carousel", items: [] }, { type: "paragraph", text: "نص" }]),
    ).toEqual([{ type: "paragraph", text: "نص" }]);
  });

  describe("heading", () => {
    it("defaults to level 2 and only allows 2 or 3", () => {
      expect(parseContentBlocks([{ type: "heading", text: "أ" }])).toEqual([
        { type: "heading", text: "أ", level: 2 },
      ]);
      expect(parseContentBlocks([{ type: "heading", text: "أ", level: 3 }])).toEqual([
        { type: "heading", text: "أ", level: 3 },
      ]);
      expect(parseContentBlocks([{ type: "heading", text: "أ", level: 5 }])).toEqual([
        { type: "heading", text: "أ", level: 2 },
      ]);
    });

    it("drops a heading with no text, which would render as a visual hole", () => {
      expect(parseContentBlocks([{ type: "heading", text: "   " }])).toEqual([]);
    });
  });

  it("trims text and drops whitespace-only optional fields", () => {
    expect(
      parseContentBlocks([{ type: "callout", text: "  تنبيه  ", title: "   " }]),
    ).toEqual([{ type: "callout", text: "تنبيه", title: undefined }]);
  });

  describe("list", () => {
    it("keeps only usable items", () => {
      expect(
        parseContentBlocks([
          { type: "list", items: ["أ", "", "  ", "ب", null, 5], title: "المميزات" },
        ]),
      ).toEqual([{ type: "list", items: ["أ", "ب"], title: "المميزات" }]);
    });

    it("drops a list with nothing left in it", () => {
      expect(parseContentBlocks([{ type: "list", items: ["", "  "] }])).toEqual([]);
      expect(parseContentBlocks([{ type: "list", items: "أ" }])).toEqual([]);
    });
  });

  describe("feature", () => {
    it("keeps a feature that has only a body", () => {
      expect(parseContentBlocks([{ type: "feature", body: "وصف" }])).toEqual([
        {
          type: "feature",
          title: "",
          body: "وصف",
          image: undefined,
          imageAlt: undefined,
          align: undefined,
        },
      ]);
    });

    it("drops a feature with neither title nor body", () => {
      expect(
        parseContentBlocks([{ type: "feature", image: "https://x/a.png" }]),
      ).toEqual([]);
    });

    it("only honours a valid align, leaving alternation to the renderer", () => {
      const [start] = parseContentBlocks([
        { type: "feature", title: "أ", align: "start" },
      ]);
      const [bogus] = parseContentBlocks([
        { type: "feature", title: "أ", align: "middle" },
      ]);
      expect(start).toMatchObject({ align: "start" });
      expect(bogus).toMatchObject({ align: undefined });
    });
  });

  describe("feature_grid", () => {
    it("requires a title on each item and drops the block when none survive", () => {
      expect(
        parseContentBlocks([
          {
            type: "feature_grid",
            title: "المميزات",
            items: [{ title: "أ", body: "ب" }, { body: "بدون عنوان" }, null],
          },
        ]),
      ).toEqual([
        {
          type: "feature_grid",
          title: "المميزات",
          items: [{ title: "أ", body: "ب", image: undefined }],
        },
      ]);

      expect(
        parseContentBlocks([{ type: "feature_grid", items: [{ body: "x" }] }]),
      ).toEqual([]);
    });
  });

  describe("gallery", () => {
    it("keeps only images with a URL", () => {
      expect(
        parseContentBlocks([
          {
            type: "gallery",
            images: [{ url: "https://x/a.png", alt: "أ" }, { alt: "no url" }, "x"],
          },
        ]),
      ).toEqual([
        { type: "gallery", images: [{ url: "https://x/a.png", alt: "أ" }] },
      ]);
    });

    it("drops an empty gallery", () => {
      expect(parseContentBlocks([{ type: "gallery", images: [] }])).toEqual([]);
    });
  });

  describe("spec_highlight", () => {
    it("requires both a label and a value", () => {
      expect(
        parseContentBlocks([
          {
            type: "spec_highlight",
            items: [
              { label: "السعة", value: "396 لتر" },
              { label: "بدون قيمة", value: "" },
              { value: "بدون اسم" },
            ],
          },
        ]),
      ).toEqual([
        {
          type: "spec_highlight",
          items: [{ label: "السعة", value: "396 لتر" }],
        },
      ]);
    });
  });

  describe("image and video", () => {
    it("requires a URL", () => {
      expect(parseContentBlocks([{ type: "image", alt: "أ" }])).toEqual([]);
      expect(parseContentBlocks([{ type: "video", title: "أ" }])).toEqual([]);
    });

    it("keeps the optional fields when present", () => {
      expect(
        parseContentBlocks([
          { type: "image", url: "https://x/a.png", alt: "أ", caption: "ب" },
        ]),
      ).toEqual([
        { type: "image", url: "https://x/a.png", alt: "أ", caption: "ب" },
      ]);
    });
  });

  it("preserves author order across mixed block types", () => {
    const blocks = parseContentBlocks([
      { type: "heading", text: "نظرة عامة" },
      { type: "paragraph", text: "وصف" },
      { type: "spec_highlight", items: [{ label: "السعة", value: "396 لتر" }] },
    ]);
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "spec_highlight",
    ]);
  });
});

describe("hasContentBlocks", () => {
  it("is false when nothing survives parsing, so the section is skipped", () => {
    expect(hasContentBlocks(null)).toBe(false);
    expect(hasContentBlocks([])).toBe(false);
    expect(hasContentBlocks([{ type: "heading", text: "" }])).toBe(false);
  });

  it("is true once at least one block is usable", () => {
    expect(hasContentBlocks([{ type: "paragraph", text: "نص" }])).toBe(true);
  });
});

describe("contentBlocksToPlainText", () => {
  it("is empty when there is nothing to describe", () => {
    expect(contentBlocksToPlainText(null)).toBe("");
    expect(contentBlocksToPlainText([])).toBe("");
  });

  it("joins the prose so a block-authored product still gets a meta description", () => {
    expect(
      contentBlocksToPlainText([
        { type: "heading", text: "نظرة عامة" },
        { type: "paragraph", text: "ثلاجة نوفروست بسعة كبيرة" },
      ]),
    ).toBe("نظرة عامة ثلاجة نوفروست بسعة كبيرة");
  });

  it("flattens labelled block types into readable text", () => {
    expect(
      contentBlocksToPlainText([
        { type: "spec_highlight", items: [{ label: "السعة", value: "396 لتر" }] },
        { type: "list", title: "المميزات", items: ["تبريد سريع", "موفر للطاقة"] },
      ]),
    ).toBe("السعة: 396 لتر المميزات تبريد سريع، موفر للطاقة");
  });

  it("skips blocks whose only content is a URL", () => {
    // A raw embed URL or an image with no caption makes a worse snippet than none.
    expect(
      contentBlocksToPlainText([
        { type: "video", url: "https://youtube.com/embed/x", title: "فيديو" },
        { type: "gallery", images: [{ url: "https://x/a.png", alt: "أ" }] },
        { type: "image", url: "https://x/b.png", alt: "ب" },
      ]),
    ).toBe("");
  });

  it("keeps an image caption, which is authored prose", () => {
    expect(
      contentBlocksToPlainText([
        { type: "image", url: "https://x/a.png", caption: "الرف الزجاجي" },
      ]),
    ).toBe("الرف الزجاجي");
  });

  it("collapses whitespace so the excerpt does not carry newlines", () => {
    expect(
      contentBlocksToPlainText([{ type: "paragraph", text: "سطر\n\nآخر" }]),
    ).toBe("سطر آخر");
  });
});
