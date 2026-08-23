# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # next dev (http://localhost:3000)
npm run build      # next build
npm run start      # serve the production build
npm run lint       # eslint (flat config, eslint-config-next core-web-vitals + typescript)
npm run typecheck  # tsc --noEmit
npm run test       # vitest run (unit)
npm run test:e2e   # playwright test (needs `npx playwright install chromium` once)
```

`npm run lint` currently reports ~10 pre-existing errors (mostly `react-hooks/set-state-in-effect` and `no-explicit-any`) in files unrelated to orders. Don't treat a clean lint as the bar for unrelated work; do keep new code clean.

Testing (added 2026-08-18): Vitest for pure logic in node env (`src/**/*.test.ts`), Playwright for E2E (`e2e/`). The order status state machine in `features/orders/constants/order-status.ts` is deliberately import-free so it can be unit-tested with zero mocks — keep it that way.

**Playwright never touches the real database.** `e2e/stub-supabase.mjs` is a PostgREST stub and `playwright.config.ts` points `NEXT_PUBLIC_SUPABASE_URL` at it for *both* the browser and the Next server. That matters because checkout submits through a Server Action, so the Supabase call is server-side and `page.route()` cannot intercept it. The `webServer` runs `next build && next start`, not `next dev` — the React Compiler is a per-module Babel pass that in dev lands on the first request per route and flakes past navigation timeouts.

Regenerate DB types after any schema change (types are committed, not generated at build):

```bash
npx supabase gen types typescript --project-id <ref> > src/shared/types/database.types.ts
```

## Stack

Next.js 16 App Router (React 19, React Compiler enabled via `reactCompiler: true`), TypeScript strict, Tailwind v4 (CSS-first, no tailwind config content array — `src/app/globals.css`), shadcn/ui "new-york" in `src/shared/components/ui` (note: components live under `@/shared/components/ui`, **not** the `@/components/ui` alias written in `components.json`), Supabase (auth + Postgres + Storage + Realtime), TanStack Query, Zustand, Zod v4, react-hook-form, Cloudflare Turnstile, Resend (dependency present, not yet wired up).

Storefront is Arabic-first: `<html lang="ar" dir="rtl">`, Cairo font, and **all user-facing strings are Arabic**. Match that when adding UI or validation messages.

## Architecture

### Route groups

- `src/app/(customer)/` — public storefront. Its layout fetches `getNavigationCategories()` server-side and wraps children in `WishlistProvider`, `Header`, `Footer`, `MobileBottomNav`, `CompareBar`.
- `src/app/admin/` — dashboard. The layout is a **client** component (sidebar state + `next-themes`), so it cannot guard auth; each admin page must check auth itself (see `src/app/admin/page.tsx` or `src/app/admin/shipping/page.tsx`: `getUser()` → `profiles.role !== "admin"` → redirect). Note `/admin/orders` and `/admin/dashboard` are client components with **no page-level guard** and still rely on RLS alone.
- `src/app/auth/` — Supabase auth flows plus route handlers `auth/confirm` and `auth/sign-out`.

Catalog URLs are `/[category]/[subcategory]` (two-level self-referencing `categories.parent_id`) and `/product/[slug]`.

### Four Supabase clients — pick deliberately

| Factory | File | Use for |
| --- | --- | --- |
| `createClient()` (browser) | `lib/supabase/client.ts` | client components, Realtime channels |
| `createClient()` (server, cookie-bound) | `lib/supabase/server.ts` | Server Actions and any request-scoped read where the **user session / RLS** matters |
| `createStaticClient()` | `lib/supabase/server.ts` | ISR pages, `generateStaticParams`, `sitemap.ts` — no cookies, so it is safe outside a request context |
| `createAdminClient()` | `lib/supabase/admin.ts` | backend tasks that must bypass RLS; uses `SUPABASE_SERVICE_ROLE_KEY`, falling back to the public key when unset. Used by `features/orders/actions/cancel-order.ts` (customers have no UPDATE policy on `orders`). Check `process.env.SUPABASE_SERVICE_ROLE_KEY` before relying on it — the fallback silently loses RLS bypass |

Reading user-scoped data with `createStaticClient()` silently returns nothing (no cookies → anon). Using cookie-bound `createClient()` in a statically rendered page opts the route out of static generation.

### Data-access layers (three, by intent)

- `src/services/server/*` — read-only fetchers for RSC/ISR, built on `createStaticClient()`. `products.ts` is the hub: every query re-selects the same `*, brand:brands(*), category:categories(*), images:product_images(*)` shape and returns `[]`/`null` on error rather than throwing.
- `src/services/client/*` — the same reads from the browser via TanStack Query.
- `src/features/*/actions/*.ts` — `"use server"` mutations. They return `{ success, message }` / `{ error }` objects instead of throwing (the UI toasts them via `sonner`), and end with explicit `revalidatePath()` calls.

`src/actions/` (login, signup, checkout) holds the few cross-feature actions that predate the feature folders.

### Feature modules

`src/features/<domain>/{actions,components,hooks,context}` — cart, checkout, orders, products, search, wishlist, offers, admin. Route-specific one-off components live in `_components/` next to the page. Shared layout/UI lives in `src/shared/`.

### Cache invalidation

Storefront pages are ISR: `export const revalidate = 3600` (home, product, featured, offers, best-sellers), `60` for subcategory listings, `0` for wishlist. Because of this, **any mutation that changes catalog data must revalidate the matching paths** — `update-product.ts` is the reference: it looks up the product slug and revalidates `/product/<slug>`, `/admin/products`, and `/`. Product pages additionally poll for price freshness client-side (`useRealtimePrice`, 30s interval + refetch on focus) layered over the ISR-rendered data.

### Realtime

`useNotifications` subscribes to a `postgres_changes` INSERT channel on `notifications` and pushes rows straight into the React Query cache with `setQueryData`. Any new Realtime feature needs its table added to the Supabase publication.

### Auth

`src/proxy.ts` (Next 16's renamed middleware) → `lib/supabase/updateSession` refreshes the session cookie on every non-static request. **Its redirect-unauthenticated block is commented out on purpose** — the site is browsable by guests and checkout supports guest orders, so route protection is per-page. `src/lib/supabase/middleware.ts` is a leftover scaffold copy that nothing imports (it uses a different env var name and still redirects); edit `proxy.ts`, not that file.

Admin identity = `profiles.role === "admin"`; there is also an `is_admin()` Postgres function used by RLS.

## Database

Tables: `products`, `product_images`, `categories` (self-referencing), `brands`, `orders`, `order_items`, `order_status_history`, `order_payments`, `governorates`, `app_settings`, `profiles`, `wishlists`, `notifications`. RPCs: `search_products(search_term, limit_count)` — search goes through this function, not ILIKE queries — and `governorate_order_stats()` (admin-only, SECURITY DEFINER).

Arabic text columns are suffixed `_ar` (`name_ar`, `description_ar`) and are what the UI renders. Product flags drive the storefront sections: `is_active`, `is_featured`, `is_best_seller`, `is_special_offer`, `is_new`.

Order status values are **Arabic strings**, enforced by the `orders_status_check` constraint: `قيد الانتظار`, `جاري التجهيز`, `تم الشحن`, `تم التوصيل`, `ملغي`, `مرتجع`, `تم التأكيد`. Note the `orders.status` column **default is still `'pending'`**, which the constraint rejects — every insert must set `status` explicitly.

### Order status state machine (rebuilt 2026-08-18)

Transitions are **forward-only** and there is **no admin override**:

```
قيد الانتظار → تم التأكيد → جاري التجهيز → تم الشحن → تم التوصيل → مرتجع
     └──────────────┴──────────────┴──→ ملغي
```

`ملغي` and `مرتجع` are terminal. Customers may cancel any time **before** `تم الشحن`.

Rules to respect when touching orders:

- **`src/features/orders/constants/order-status.ts` is the single source of truth.** It replaced seven drifting copies of the status list. It is mirrored by `enforce_order_status_transition()` in Postgres — **change both in the same commit.** Icons live in `order-status-icons.ts` so the logic file stays import-free and unit-testable.
- **Never insert into `order_status_history` from application code.** The `log_status_change_trigger` (SECURITY DEFINER, so it bypasses RLS) is the sole writer and fires on order INSERT and on every status change. An app-level insert produces a duplicate row per transition — that was the original bug. A `UNIQUE (order_id, status)` constraint keeps each step unique, which is safe because the machine is acyclic.
- The table's columns are `id, order_id, status, notes, changed_by, created_at` — there is **no** `previous_status`/`new_status` pair. The previous status is simply the preceding row.
- `orders` has **no customer UPDATE policy**, which is why `cancel-order.ts` needs the service-role client (`lib/supabase/admin.ts`). Every ownership and business rule is checked *before* that client is used.
- Any UPDATE on `orders` that must not silently no-op needs `.select().single()` — without it, an RLS-blocked update returns no error and zero rows.

Historical note: before this rebuild, the app wrote `previous_status`/`new_status` (columns that never existed), the failures were swallowed, and 18 of 33 orders had no history at all.

### Money: currency, shipping, payments (added 2026-08-22)

**Currency is EGP and there is exactly one formatter** — `formatCurrency` in `lib/utils.ts`. Do not hand-roll `` `${n.toLocaleString()} ج.م` ``; that drift is what left `ر.س` (Saudi riyal) rendering on the customer order page. It deliberately does **not** use `Intl` currency style, which emits Arabic-Indic digits that clash with the Latin numerals the rest of the site uses.

**Shipping cost is per governorate, admin-editable.** `governorates` (27 rows, seeded) holds `shipping_cost` + `is_deliverable`; `/admin/shipping` edits them alongside real order traffic from `governorate_order_stats()`. `app_settings` is a public-readable key/value table for site-wide values (free-shipping threshold, wallet numbers, WhatsApp number) — **never put secrets there.** `resolveShippingCost` in `features/checkout/lib/shipping.ts` is import-free and runs on both server and client so the quoted and charged numbers cannot diverge.

**`orders.shipping_governorate` stays free text** (an order snapshots the name it was placed under), but checkout now picks from the table. `normalize_governorate_name()` collapses the Arabic spelling variants — 9 distinct strings for 5 governorates existed before this landed, which made traffic grouping useless.

**Checkout recomputes every total server-side.** `createOrder` re-reads prices from `products` and the rate from `governorates`; the browser cart is treated as nothing more than a list of (product id, quantity). It previously summed the client's `item.price`, so a crafted request bought anything for 1 EGP. There is a Playwright regression test for this.

#### Payment status is derived, never set

- **`order_payments` is an append-only ledger** and the sole input to `orders.payment_status` and `orders.amount_paid`. `sync_order_payment_totals_trigger` recomputes both on **every** write to `orders`, so application code cannot set them — whatever it sends is overwritten. Same discipline as `log_status_change_trigger` owning `order_status_history`.
- Because it fires on every `orders` write, **changing `total` re-derives payment status.** Adding shipping to a paid order correctly drops it back to `partially_paid`; without that the shop silently under-collects.
- **Never delete or edit a payment row.** Corrections and refunds are compensating **negative** rows (`voidPayment` does this), which preserves `recorded_by` and the original timestamp — the two things that make a dispute resolvable later.
- **`src/features/orders/constants/payment.ts` is the single source of truth**, import-free and unit-tested, mirroring `orders_payment_status_check`, `orders_payment_method_check` and `derive_payment_status()`. **Change the TS and the SQL in the same commit.** Icons live in `payment-icons.ts`.
- **Values are English tokens with Arabic labels in the registry** — the one deliberate departure from the order-status convention, because the column already held `unpaid`/`paid` behind a live constraint and these map onto what a gateway (Paymob/Fawry) would return.
- **Payment status is orthogonal to order status.** An order is legitimately `جاري التجهيز` *and* `مدفوعة جزئياً`. Do not add payment states to `ORDER_STATUSES` — it would turn 7 states into ~28 and break the acyclicity that `UNIQUE (order_id, status)` depends on.
- Shipping an unpaid order is **warned about, not blocked** (`OrdersTable`'s confirm dialog). A hard rule would make a trusted-customer COD order unshippable, and the storefront advertises الدفع عند الاستلام.
- The partial unique index on `(order_id, reference)` catches the "admin submitted the same transfer twice" mistake; `recordPayment` turns the 23505 into an Arabic message.

**Customer payment instructions live on the page** (`/order-success/[id]` and `/account/orders/[id]`), not in `notifications`. That table has **no recipient column** — it is a single global admin feed — and checkout supports guest orders with no user account, which a per-user feed could never reach.

**`updateOrderStatus` now calls `requireAdmin()`.** It was an unguarded exported Server Action relying solely on whatever `orders` UPDATE policy exists in the dashboard.

### Admin product authoring (added 2026-08-19)

Full-page create and edit at `/admin/products/new` and `/admin/products/[id]/edit`, plus a content-image library at `/admin/products/media`. The old `UpdateProductModal` / `useUpdateProduct` / `update-product.ts` trio is gone — there is now exactly one write path for product details.

- **`src/features/admin/products/schema.ts` is the single source of truth** for what a product form can contain. `toProductRow()` maps it to columns; anything writing `products` from the admin should go through it.
- **`price` is the *effective* price; `old_price` is the pre-offer price.** All offer maths lives in `lib/pricing.ts` (`normalizeOfferPricing` / `toOfferFormValues`), which also owns `is_special_offer` — `getOffers()` selects on that flag alone, so it must move with `old_price`.
- `contentBlockSchema` is asserted assignable to the storefront's `ContentBlock` union via `CONTENT_BLOCKS_MATCH_RENDERER`. If the editor and `content-blocks.ts` drift, **`npm run typecheck` fails** instead of blocks silently vanishing at render time.
- Column traps encoded in `toProductRow`: `fts` is GENERATED (never send it), `buying_price` is checked `> 0` (empty → `null`, never `0`), `content_blocks` must be `null` not `[]`, `features` is `text[]`, `video_urls` is an object keyed `unboxing|features|troubleshooting`.
- **Specification keys are suggested per category** (`actions/spec-suggestions.ts`), not free text. `groupSpecifications()` matches keys by exact string, so one `السعه` instead of `السعة` drops the row out of its group and out of the buy-box chips, and makes two products incomparable.
- **Delete is a soft delete** (`is_active = false`) — `order_items.product_id` references `products`, so a hard delete would orphan order history. Archived products get their own tab.
- **Images upload browser-direct to Storage** (`lib/storage.ts`), because Server Actions cap the request body below a typical product photo. `product_images.storage_path` is now populated so deletes remove the file too.
- Every mutation calls `requireAdmin()` (`src/features/admin/lib/require-admin.ts`) and revalidates through `lib/revalidate-product.ts`, which covers the category/subcategory listings and `/sitemap.xml` that the old action missed.

Migration `20260819090000_admin_product_image_write_access` added the admin INSERT/UPDATE/DELETE policies on `product_images` and on `storage.objects` for the `products` bucket — **both were SELECT-only, so image writes were impossible**; the 93 existing rows were created through the dashboard, which bypasses RLS. It also added a `unique (product_id) where is_primary` index (3 products had two primaries, 21 had none).

### Product variant groups (added 2026-08-23)

One physical product sold in several finishes — `SJ-58C(BK)` / `(SL)` / `(ST)` is one fridge in three colours. `product_groups` holds what the variants share (`name_ar`, ordered `axes`); each variant stays its own `products` row with its own slug, SKU, price, stock and images, carrying `group_id`, `variant_values` (jsonb, keyed by axis) and `is_group_primary`.

- **Variant URLs stay indexable and self-canonical.** Separate URLs per colour are not a duplicate-content penalty — Google supports them and publishes `ProductGroup`/`hasVariant` for exactly this. What cost rankings was that the siblings were *unlinked and unmarked*. Nothing is deindexed and no canonical points sideways.
- **`src/features/products/constants/variant-axes.ts` is the single source of truth** for axis keys and colour spelling, import-free and unit-tested, mirroring `normalize_color_name()` in Postgres — **change both in the same commit.** Verified parity across all 26 live colour values.
- **`src/features/products/lib/variant-group.ts`** is the pure grouping logic (`collapseVariants`, `pickRepresentative`). Import-free, same discipline as `specifications.ts`.
- **Collapse runs after filtering, and sorting runs after collapsing.** `ProductGrid` collapses, so every listing gets it without changing call sites. `ProductsClient` sorts *groups* by their representative, because a card advertises the representative's price — sorting raw variants would place a group at its cheapest member's position while showing a higher number.
- **Swatches must be real `<a>`/`<Link>`, never client-side state.** Crawlable internal links are the entire mechanism; a `useState` switcher would emit none. Out-of-stock variants stay linked and are only dimmed. Verified: the brand page renders 12 cards from 16 active products with all 16 variant URLs still in the HTML.
- **Axis keys reuse spec keys** (`اللون`, `السعة`) because `groupSpecifications()` matches by exact string; a parallel vocabulary would let the selector and the spec table disagree.
- `getVariantSiblings` filters `is_active` and returns `[]` for a group of one — an archived variant has no page for a swatch to link to, and a group of one must not emit a `ProductGroup` claiming a relationship that does not exist.
- **Revalidation fans out across siblings.** Each variant page statically embeds its siblings' prices, so editing one makes the others wrong for up to an hour; `revalidateProduct` takes `siblingSlugs` and every admin write supplies them.
- `is_group_primary` is **not** owned by the product form (it is absent from `ProductRowPayload`, so a save never touches it). It is set by the backfill and by `startVariantFromProduct`; there is no UI to reassign it yet.
- **"أضف لوناً جديداً"** (`actions/variant-groups.ts`) creates the group if needed, makes the source its primary, and opens `/admin/products/new?duplicateFrom=<id>` prefilled with everything except SKU, slug, meta and the axis value.

Migration `20260823090000_variant_data_hygiene` fixed what blocked this: **seven SKUs carried surrounding whitespace** on a UNIQUE column (three leading spaces, four trailing newlines), `RF-31FTV-DST` had three spec fields pasted from a different product, and colour had already drifted (`سيلفر`/`فضي`, `أسود`/`اسود`, `استانلس`/`استانلس ستيل`). Note `btrim(x)` strips **spaces only, not newlines** — that trap made an earlier version of the migration a silent no-op on four rows. `20260823092000_backfill_variant_groups` then grouped seven hand-verified clusters from a hardcoded SKU list; the SKU-suffix regex used to *discover* them is deliberately not shipped, because it mis-grouped `RF-31FTV` (whose members are 296 لتر and 355 لتر — different products, not finishes).

`supabase/` holds `config.toml` (project id `alharmeen-group`) and, since 2026-08-18, tracked migrations in `supabase/migrations/`. There is no local Supabase stack, and the CLI is **not linked** (no `supabase/.temp/project-ref`). The remote migration history started empty, so **don't generate a baseline schema dump**. Add forward-only migrations.

**Don't run `npx supabase db push`.** The remote history records different version numbers than the local filenames (local `20260818090000_order_status_history_integrity.sql` vs remote `20260818055857`), because migrations have been applied through the Supabase MCP `apply_migration` tool, which stamps its own timestamp. `db push` would therefore consider every local file unapplied and try to re-run all of them. Apply new migrations the same way they have been so far — via `apply_migration` — and keep the `.sql` file in `supabase/migrations/` as the tracked record.

## Environment

`.env.local` (gitignored via `.env*`, populated locally — no `.env.example` is tracked):

| Var | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zhpkzslvzifaaehdfnha.supabase.co` (project ref `zhpkzslvzifaaehdfnha`, eu-central-1) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | modern `sb_publishable_…` key; supabase-js ^2.91 + ssr ^0.8 both accept it |
| `SUPABASE_SERVICE_ROLE_KEY` | secret, **leave unset rather than placeholder** — `admin.ts` does `SERVICE_ROLE || PUBLISHABLE`, so a junk value breaks the fallback |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | must match the secret configured in Supabase Auth → Attack Protection, since Supabase (not this app) verifies the token |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` locally; prod is `https://www.alharmaingroup.com` |

The unused `lib/supabase/middleware.ts` references `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` — that name is not the one in use.

Turnstile is only ever verified by Supabase as part of `signInWithPassword`/`signUp` (`options.captchaToken`); this app never calls `siteverify` itself. A missing token is rejected client-side in `actions/login.ts` / `actions/signup.ts`, but an *invalid* one only fails if captcha is enabled server-side in Supabase.

Remote images are restricted to `**.supabase.co` and `images.unsplash.com` in `next.config.ts`; a new image host must be added there.

## Known gaps and follow-ups

Open work, recorded so it is not rediscovered from scratch. Ordered roughly by value.

### Variant groups — admin UX (the biggest gap)

The storefront half of variant groups is complete; the admin half is the minimum that makes it usable, and it shows.

1. **There is no way to see a group's members, and no way to find the "origin" product.** The group `<select>` on the product form lists group *names* only. A group whose only member is the product that created it looks identical to a fully-populated one, and nothing tells you which product is the primary or what colours are already taken. Needed: a group summary on the edit page (members, their colours, which is primary, links between them), and ideally an `/admin/products/groups` page. Until it exists, the group name is derived from the origin product's name minus its SKU, and the origin is the row with `is_group_primary = true`.
2. **The group picker is shown on every product, including standalone ones.** Most products are not variants and never will be, so the field is noise on the majority of the catalogue and invites mis-grouping. It should be collapsed behind a disclosure, or only surfaced for products that already belong to a group or arrived via `?duplicateFrom=`.
3. **No UI to reassign `is_group_primary`, rename a group, move a product between groups, merge two groups, or delete an empty one.** `is_group_primary` is deliberately absent from `ProductRowPayload` so a normal save never touches it — reassignment needs its own action.
4. **A group can be left with one member** (archive one of a pair) and nothing flags it. It renders correctly — `getVariantSiblings` returns `[]` — but the group is then dead weight.
5. **`startVariantFromProduct` derives the group name by stripping the trailing SKU**, so the colour word stays in it ("… 450 لتر أسود"). Harmless but wrong-looking, and unfixable without a rename UI (item 3).

### Variant groups — deferred by design

6. **Phase 2: group-owned shared content.** Move `description_ar`, `content_blocks`, `features` and `warranty_info` onto `product_groups` with a per-product override, so a correction is made once instead of once per colour. Agreed as a later phase; this is the remaining half of the effort saving.
7. **Multi-axis selector.** The schema is multi-axis but `VariantSelector` renders one row of whole variants. A group varying by colour *and* capacity needs one row per axis with unavailable combinations disabled. No such product exists yet, so it was left unbuilt rather than untested.
8. **E2E coverage for variants.** `e2e/stub-supabase.mjs` has no `product_groups`, so the switcher and the collapsed grid are covered only by unit tests plus manual verification against the built HTML.

### Catalogue data

9. **`SJ-58C(ST)` has one image and it is a photo of a Tornado 396L** (`tornado-…-rf-48t-st-…jpg`) on a Sharp 450L product. Now more visible, not less: that row is its group's primary, so it represents the group in listings and structured data.
10. **Spec values are inconsistent within groups.** `SJ-58C(BK)` records `السعة = "450"` while `(ST)` records `"450 لتر"`; `SJ-58C(SL)` and `SJ-PV63G-BK` have no colour or capacity spec at all. `groupSpecifications()` matches by exact string, so these fall out of their group and out of the buy-box chips.

### Pre-existing bugs found while building this

None of these were introduced by the variant work; they were found alongside it.

11. **`/compare` is permanently empty.** `src/app/(customer)/compare/page.tsx:16-17` selects `name` and `description`, neither of which is a `products` column. PostgREST 400s, the error is swallowed, and the page renders zero products every time. Its `searchParams` prop is also typed as a plain object but `await`ed.
12. **`/search` does not exist.** `SearchBar.tsx:74` pushes to `/search?q=…`, so both "عرض كل النتائج" and Enter-to-submit 404. There is no `src/app/search`.
13. **`useRealtimePrice` / `LivePrice` / `getProductPrice` are unreferenced.** The 30s price polling described above this section is not wired to any page; the PDP shows an ISR price up to an hour stale.
14. **`wishlist.ts:40` revalidates `/products/${productId}`** — wrong segment (`/product`) and wrong identifier (id, not slug). A no-op.
15. **Category listings render client-side.** `useSearchParams()` inside the Suspense boundary opts `ProductsClient` out of SSR, so `/[category]/[subcategory]` ships no product markup in its initial HTML. Variant discovery is unaffected (PDP switchers, brand grids and the sitemap all carry the links), but the listings themselves are invisible to a non-rendering crawler.
16. **Sitemap gaps.** No top-level `/[category]`, `/brand/[slug]`, `/offers`, `/featured`, `/best-sellers`, `/about-us` or `/contact`, and every entry uses `lastModified: new Date()` rather than `updated_at`.
17. **Canonical host is inconsistent.** Every SEO string hardcodes the apex `https://alharmaingroup.com` while `src/lib/site-url.ts:27` falls back to `https://www.alharmaingroup.com`. Pick one.
18. **`/[category]/[subcategory]` never 404s** for an unknown subcategory — it renders an empty, indexable, self-canonical page.
19. **`/compare` and `/wishlist` are crawlable, canonical-less and parameterised** (`?products=`), which is thin-content risk.
