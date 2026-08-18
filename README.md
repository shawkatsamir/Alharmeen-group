# الحرمين جروب — Alharmeen Group

Arabic-first e-commerce storefront for a home-appliance retailer in Egypt, an
authorized dealer for **Elaraby**, **Fresh**, **LG** and **Midea**.

Production: <https://www.alharmaingroup.com>

Built with Next.js 16 (App Router, React 19, React Compiler), TypeScript strict,
Tailwind v4, shadcn/ui, and Supabase (auth, Postgres, Storage, Realtime).

> The entire storefront renders right-to-left (`<html lang="ar" dir="rtl">`) and
> **all user-facing strings are Arabic**, including validation messages and
> order statuses. Match that when adding UI.

---

## Getting started

**Prerequisites:** Node.js 20+ and npm. Access to the Supabase project
(`alharmeen-group`) for the API keys.

```bash
npm install
cp /dev/null .env.local   # then fill it in — see below
npm run dev               # http://localhost:3000
```

### Environment variables

Create `.env.local` in the repo root. It is gitignored (`.env*`), and there is
no tracked `.env.example`.

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | The modern `sb_publishable_…` key. Dashboard → Project Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | for order cancellation | Secret. **Bypasses RLS** — server-only, never expose it |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | for login/signup | Must match the secret configured in Supabase → Auth → Attack Protection, because *Supabase* verifies the token, not this app |
| `NEXT_PUBLIC_BASE_URL` | yes | `http://localhost:3000` locally; the production origin in prod |

> **Leave `SUPABASE_SERVICE_ROLE_KEY` unset rather than giving it a placeholder.**
> `src/lib/supabase/admin.ts` falls back to the publishable key when the
> variable is absent, so a junk value silently breaks that fallback instead of
> degrading gracefully.

---

## Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint (flat config)
npm run typecheck   # tsc --noEmit
npm run test        # unit tests (Vitest)
npm run test:watch  # unit tests in watch mode
npm run test:e2e    # end-to-end tests (Playwright)
```

### Testing

- **Vitest** (`src/**/*.test.ts`, node environment) covers pure logic — most
  importantly the order status state machine.
- **Playwright** (`e2e/`) covers the order creation flow end to end.

Playwright never touches the real database. `e2e/stub-supabase.mjs` is a small
PostgREST stub, and `playwright.config.ts` points `NEXT_PUBLIC_SUPABASE_URL` at
it for both the browser and the Next server. This matters because checkout
submits through a **Server Action** — the Supabase call is made server-side, so
browser-level request interception cannot see it.

The Playwright `webServer` runs `next build && next start`, not `next dev`: the
React Compiler is a per-module Babel pass that in dev lands on the first request
to each route, which flakes past navigation timeouts.

First run only:

```bash
npx playwright install chromium
```

---

## Order status state machine

Statuses are **Arabic strings** enforced by the `orders_status_check`
constraint. Transitions are **one-way** — an order can never move backwards.

```
قيد الانتظار  →  تم التأكيد  →  جاري التجهيز  →  تم الشحن  →  تم التوصيل
     │               │               │                            │
     └───────────────┴───────────────┘                            ↓
                     ↓                                          مرتجع
                   ملغي
```

- **Terminal states:** `ملغي` (cancelled) and `مرتجع` (returned).
- **Customers may cancel** any time before `تم الشحن`. After shipping, the
  correction path is `مرتجع`, not cancellation.
- **No admin override.** The same machine applies to the service-role client.

The machine is defined once in
[`src/features/orders/constants/order-status.ts`](src/features/orders/constants/order-status.ts)
and mirrored by the `enforce_order_status_transition()` trigger in Postgres.
**Change both in the same commit.**

`order_status_history` is written **only** by the `log_status_change_trigger`
database trigger, which fires on order insert and on every status change.
Application code must never insert into that table — doing so produces a
duplicate row for every transition. A `UNIQUE (order_id, status)` constraint
keeps each timeline step unique, which is safe precisely because the machine is
acyclic.

---

## Database migrations

Schema changes live in `supabase/migrations/` and are applied to the hosted
project (there is no local Supabase stack configured).

```bash
npx supabase db push                 # apply pending migrations
```

Regenerate the committed types after any schema change:

```bash
npx supabase gen types typescript --project-id <ref> > src/shared/types/database.types.ts
```

---

## Project layout

```
src/
  app/
    (customer)/   storefront — ISR, wrapped in Header/Footer/WishlistProvider
    admin/        dashboard — client layout, so each page guards auth itself
    auth/         Supabase auth flows + route handlers
  features/<domain>/{actions,components,hooks,constants}
  services/server/   read-only fetchers for RSC/ISR
  services/client/   the same reads from the browser via TanStack Query
  shared/            shared layout and UI (shadcn/ui lives in shared/components/ui)
  lib/supabase/      four client factories — pick deliberately
e2e/                 Playwright specs + the Supabase stub
supabase/migrations/ SQL migrations
```

Catalog URLs are `/[category]/[subcategory]` and `/product/[slug]`.

See [CLAUDE.md](CLAUDE.md) for the deeper architecture notes: which Supabase
client to use where, the ISR/revalidation rules, and known traps.
