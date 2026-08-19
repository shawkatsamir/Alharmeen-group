import type { ContentBlockInput } from "../schema";

/**
 * Presentation metadata for the block editor.
 *
 * Kept beside the schema rather than inside `content-blocks.ts` for the same
 * reason `order-status-icons.ts` is split from `order-status.ts`: the parser
 * stays import-free and unit-testable, and the labels live where the UI needs
 * them.
 */

export type BlockType = ContentBlockInput["type"];

export interface BlockTypeMeta {
  type: BlockType;
  label: string;
  hint: string;
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
  { type: "heading", label: "عنوان", hint: "عنوان لبداية قسم جديد" },
  { type: "paragraph", label: "فقرة", hint: "نص وصفي" },
  { type: "callout", label: "ملاحظة مميزة", hint: "معلومة مهمة داخل إطار ملون" },
  { type: "list", label: "قائمة نقاط", hint: "نقاط بعلامة صح" },
  { type: "feature", label: "ميزة بصورة", hint: "صورة بجانب نص، تتبادل الجهات" },
  { type: "feature_grid", label: "شبكة مميزات", hint: "عدة مميزات في بطاقات" },
  { type: "image", label: "صورة", hint: "صورة عرضية مع تعليق" },
  { type: "gallery", label: "معرض صور", hint: "عدة صور بجانب بعضها" },
  {
    type: "spec_highlight",
    label: "مواصفات بارزة",
    hint: "أرقام مختصرة مثل السعة والقدرة",
  },
  { type: "video", label: "فيديو", hint: "رابط تضمين YouTube" },
];

export const BLOCK_LABELS: Record<BlockType, string> = BLOCK_TYPES.reduce(
  (acc, meta) => {
    acc[meta.type] = meta.label;
    return acc;
  },
  {} as Record<BlockType, string>,
);

/** A newly added block, valid enough to render once the author fills it in. */
export function createBlock(type: BlockType): ContentBlockInput {
  switch (type) {
    case "heading":
      return { type: "heading", text: "", level: 2 };
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "callout":
      return { type: "callout", text: "", title: undefined };
    case "list":
      return { type: "list", items: [""], title: undefined };
    case "feature":
      return { type: "feature", title: "", body: undefined, image: undefined };
    case "feature_grid":
      return { type: "feature_grid", title: undefined, items: [{ title: "" }] };
    case "image":
      return { type: "image", url: "", alt: undefined, caption: undefined };
    case "gallery":
      return { type: "gallery", images: [{ url: "" }] };
    case "spec_highlight":
      return { type: "spec_highlight", items: [{ label: "", value: "" }] };
    case "video":
      return { type: "video", url: "", title: undefined };
  }
}

/** Move an item within an array, returning a new array. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
