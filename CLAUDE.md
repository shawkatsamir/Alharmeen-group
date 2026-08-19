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
- `src/app/admin/` — dashboard. The layout is a **client** component (sidebar state + `next-themes`), so it cannot guard auth; each admin page must check auth itself (see `src/app/admin/page.tsx`: `getUser()` → `profiles.role !== "admin"` → redirect).
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

Tables: `products`, `product_images`, `categories` (self-referencing), `brands`, `orders`, `order_items`, `order_status_history`, `profiles`, `wishlists`, `notifications`. RPC: `search_products(search_term, limit_count)` — search goes through this function, not ILIKE queries.

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
