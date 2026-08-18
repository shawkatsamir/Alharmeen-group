import { describe, expect, it } from "vitest";
import {
  hasRichContent,
  sanitizeRichHtml,
  toPlainTextExcerpt,
} from "./rich-content";

describe("sanitizeRichHtml", () => {
  it("returns an empty string for nullish input", () => {
    expect(sanitizeRichHtml(null)).toBe("");
    expect(sanitizeRichHtml(undefined)).toBe("");
    expect(sanitizeRichHtml("")).toBe("");
  });

  it("strips the Tailwind classes that were typed into Supabase", () => {
    // This is the real shape of the stored data.
    const input =
      '<div class="space-y-6"><h2 class="text-2xl font-bold">غسالة هيتاشي</h2></div>';
    expect(sanitizeRichHtml(input)).toBe("<div><h2>غسالة هيتاشي</h2></div>");
  });

  it("keeps the tags actually present in the catalog", () => {
    const input =
      '<div><h2>عنوان</h2><h3>فرعي</h3><p><strong>سعة:</strong> 8 كجم<br/></p><ul><li>ميزة</li></ul><span>ملاحظة</span></div>';
    const out = sanitizeRichHtml(input);
    expect(out).toContain("<h2>عنوان</h2>");
    expect(out).toContain("<h3>فرعي</h3>");
    expect(out).toContain("<strong>سعة:</strong>");
    expect(out).toContain("<ul><li>ميزة</li></ul>");
    expect(out).toContain("<span>ملاحظة</span>");
    expect(out).toContain("<br />");
  });

  it("removes script elements together with their contents", () => {
    const input = '<p>قبل</p><script>alert("xss")</script><p>بعد</p>';
    const out = sanitizeRichHtml(input);
    expect(out).toBe("<p>قبل</p><p>بعد</p>");
    expect(out).not.toContain("alert");
  });

  it("removes style, iframe and form elements with their contents", () => {
    expect(sanitizeRichHtml("<style>p{color:red}</style><p>ok</p>")).toBe(
      "<p>ok</p>",
    );
    expect(sanitizeRichHtml('<iframe src="evil"></iframe><p>ok</p>')).toBe(
      "<p>ok</p>",
    );
    expect(
      sanitizeRichHtml('<form><input name="x"></form><p>ok</p>'),
    ).toBe("<p>ok</p>");
  });

  it("drops event-handler attributes by dropping every attribute", () => {
    const input = '<p onclick="steal()" onmouseover="x()">نص</p>';
    expect(sanitizeRichHtml(input)).toBe("<p>نص</p>");
  });

  it("neutralises javascript: and data: URLs by removing anchors and images", () => {
    // `a` and `img` are not in the allowlist, so the vector cannot survive.
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">نص</a>')).toBe("نص");
    expect(sanitizeRichHtml('<img src="x" onerror="alert(1)">')).toBe("");
  });

  it("unwraps disallowed tags but keeps their text", () => {
    expect(sanitizeRichHtml("<marquee>مرحبا</marquee>")).toBe("مرحبا");
  });

  it("removes HTML comments", () => {
    expect(sanitizeRichHtml("<!-- hidden --><p>ok</p>")).toBe("<p>ok</p>");
  });

  it("collapses wrappers left empty after attribute stripping", () => {
    expect(sanitizeRichHtml('<div class="h-4"></div><p>ok</p>')).toBe("<p>ok</p>");
  });

  it("collapses nested empty wrappers repeatedly", () => {
    expect(sanitizeRichHtml("<div><span></span></div><p>ok</p>")).toBe(
      "<p>ok</p>",
    );
  });

  it("is case-insensitive about tag names", () => {
    expect(sanitizeRichHtml("<P>نص</P>")).toBe("<p>نص</p>");
    expect(sanitizeRichHtml("<SCRIPT>bad()</SCRIPT><p>ok</p>")).toBe("<p>ok</p>");
  });
});

describe("hasRichContent", () => {
  it("is false for nullish, empty and markup-only input", () => {
    expect(hasRichContent(null)).toBe(false);
    expect(hasRichContent("")).toBe(false);
    expect(hasRichContent("<div><p></p></div>")).toBe(false);
    expect(hasRichContent("   ")).toBe(false);
  });

  it("is true when there is real text", () => {
    expect(hasRichContent("<p>وصف المنتج</p>")).toBe(true);
  });

  it("is false when only a script was present", () => {
    expect(hasRichContent("<script>alert(1)</script>")).toBe(false);
  });
});

describe("toPlainTextExcerpt", () => {
  it("returns an empty string for nullish input", () => {
    expect(toPlainTextExcerpt(null)).toBe("");
  });

  it("strips markup and collapses whitespace", () => {
    expect(
      toPlainTextExcerpt("<div>  <p>غسالة   هيتاشي</p>\n<p>ممتازة</p></div>"),
    ).toBe("غسالة هيتاشي ممتازة");
  });

  it("truncates long text on a word boundary and appends an ellipsis", () => {
    const long = `<p>${"كلمة ".repeat(80)}</p>`;
    const out = toPlainTextExcerpt(long, 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("  ");
  });

  it("does not truncate text already within the limit", () => {
    expect(toPlainTextExcerpt("<p>وصف قصير</p>", 160)).toBe("وصف قصير");
  });

  it("decodes the common entities", () => {
    expect(toPlainTextExcerpt("<p>&quot;تورنيدو&quot; &amp; شارب</p>")).toBe(
      '"تورنيدو" & شارب',
    );
  });
});
