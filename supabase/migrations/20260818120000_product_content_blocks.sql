-- Structured long-form product content.
--
-- `description_ar` currently holds hand-authored HTML that carries Tailwind
-- utility classes typed into the Supabase table editor. Tailwind scans source
-- files, not the database, so those classes were never compiled — the styling
-- silently did nothing and the markup is unsafe to inject as-is.
--
-- `content_blocks` replaces it with structured blocks that React renders, so
-- styling is owned by code. The storefront prefers `content_blocks` when
-- present and falls back to the sanitized legacy HTML otherwise, which keeps
-- every already-populated product working while the admin editor is built.
--
-- Forward-only: the remote migration history started empty, so this adds
-- objects rather than recreating existing ones.

alter table public.products
  add column if not exists content_blocks jsonb;

comment on column public.products.content_blocks is
  'Structured product content authored in the admin block editor. Array of '
  '{type, ...} objects; see src/features/products/lib/content-blocks.ts for the '
  'supported block types. NULL means fall back to description_ar.';

-- Blocks are always a JSON array when present. Without this a scalar or object
-- would parse to an empty list at render time and silently hide the content.
alter table public.products
  drop constraint if exists products_content_blocks_is_array;

alter table public.products
  add constraint products_content_blocks_is_array
  check (content_blocks is null or jsonb_typeof(content_blocks) = 'array');

-- Whitespace/slug cleanup lives in 20260818121000, which supersedes an earlier
-- attempt here that used btrim()'s default character set (spaces only) and so
-- missed the trailing newlines that were actually present.
