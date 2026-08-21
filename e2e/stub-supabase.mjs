/**
 * Minimal Supabase/PostgREST stub for end-to-end tests.
 *
 * Why this exists rather than Playwright's page.route(): checkout submits
 * through a Next Server Action, so the Supabase call is made by the Next
 * server process, not the browser. Browser-level interception cannot see it.
 * Pointing NEXT_PUBLIC_SUPABASE_URL at this process captures both sides and
 * guarantees the suite can never touch the real project.
 *
 * It implements only what the order-creation flow needs, and records every
 * write so tests can assert on the exact payload the app sent.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.STUB_PORT ?? 54999);

/** @type {{method: string, path: string, body: unknown}[]} */
let captured = [];

const ORDER_ID = "00000000-0000-4000-8000-000000000001";
const ORDER_NUMBER = "ORD-9001";

/**
 * Catalogue rows. `createOrder` re-reads every price from the database rather
 * than trusting the browser cart, so the stub has to serve the product the
 * spec seeds into localStorage or checkout rejects the order.
 */
const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCTS = [
  {
    id: PRODUCT_ID,
    name_ar: "ثلاجة هيتاشي انفرتر 316 لتر",
    price: 25000,
    is_active: true,
    is_available: true,
    brand: { name_ar: "هيتاشي" },
    images: [{ image_url: "https://example.test/fridge.jpg", is_primary: true }],
  },
];

/** Mirrors the seeded rates for the two governorates the specs use. */
const GOVERNORATES = [
  {
    id: 1,
    name_ar: "القاهرة",
    shipping_cost: 60,
    is_deliverable: true,
    display_order: 1,
    updated_at: new Date().toISOString(),
    updated_by: null,
  },
  {
    id: 2,
    name_ar: "الجيزة",
    shipping_cost: 60,
    is_deliverable: true,
    display_order: 2,
    updated_at: new Date().toISOString(),
    updated_by: null,
  },
];

/** Rows the stub pretends to hold, rebuilt on each /__reset. */
let createdOrder = null;
let createdItems = [];

const json = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-expose-headers": "*",
  });
  res.end(body);
};

/**
 * PostgREST returns a bare object (not an array) when the client asks for it
 * via Accept, which is what supabase-js `.single()` does.
 */
const respondRows = (req, res, rows) => {
  const accept = req.headers.accept ?? "";
  if (accept.includes("vnd.pgrst.object+json")) {
    if (rows.length === 0) {
      return json(res, 406, {
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
      });
    }
    return json(res, 200, rows[0]);
  }
  return json(res, 200, rows);
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(raw);
      }
    });
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") return json(res, 204, {});
  if (path === "/health") return json(res, 200, { ok: true });

  // Test-control endpoints.
  if (path === "/__captured") return json(res, 200, captured);
  if (path === "/__reset") {
    captured = [];
    createdOrder = null;
    createdItems = [];
    return json(res, 200, { ok: true });
  }

  const body = await readBody(req);
  if (req.method !== "GET") {
    captured.push({ method: req.method, path, body });
  }

  // Guest checkout: no session.
  if (path.startsWith("/auth/v1")) {
    return json(res, 401, { message: "no session" });
  }

  // Catalogue reads that checkout depends on.
  if (path === "/rest/v1/products" && req.method === "GET") {
    /*
     * Only answer checkout's `.in("id", [...])` lookup. Every other product
     * query — generateStaticParams, the catalogue pages — must keep resolving
     * to [] as it did before, or the production build tries to prerender
     * /product/[slug] from these rows and fails on the missing slug.
     */
    const idFilter = url.searchParams.get("id");
    if (idFilter?.startsWith("in.")) {
      const ids = idFilter.slice(3).replace(/[()"]/g, "").split(",");
      return respondRows(
        req,
        res,
        PRODUCTS.filter((p) => ids.includes(p.id)),
      );
    }
    return respondRows(req, res, []);
  }

  if (path === "/rest/v1/governorates" && req.method === "GET") {
    // The action looks one up with `.eq("name_ar", ...).maybeSingle()`, so the
    // filter has to be honoured — returning all rows makes PostgREST's
    // single-object mode fail with PGRST116.
    const nameFilter = url.searchParams.get("name_ar");
    const rows = nameFilter?.startsWith("eq.")
      ? GOVERNORATES.filter(
          (g) => g.name_ar === decodeURIComponent(nameFilter.slice(3)),
        )
      : GOVERNORATES;
    return respondRows(req, res, rows);
  }

  if (path === "/rest/v1/app_settings" && req.method === "GET") {
    // Free shipping disabled, so every order is charged its governorate rate.
    // Wallet numbers left blank, matching a freshly seeded project.
    return respondRows(req, res, [
      { key: "free_shipping_threshold", value: null },
      { key: "payment_vodafone_cash_number", value: "" },
      { key: "payment_instapay_handle", value: "" },
      { key: "payment_bank_account", value: "" },
      { key: "contact_whatsapp_number", value: "" },
    ]);
  }

  if (path === "/rest/v1/order_payments" && req.method === "GET") {
    // No payments recorded during checkout; the ledger starts empty.
    return respondRows(req, res, []);
  }

  if (path === "/rest/v1/orders") {
    if (req.method === "POST") {
      const row = Array.isArray(body) ? body[0] : body;
      createdOrder = {
        id: ORDER_ID,
        order_number: ORDER_NUMBER,
        created_at: new Date().toISOString(),
        // Derived by trigger in the real database; a new order has no
        // payments, so the success page must see 0 rather than undefined.
        amount_paid: 0,
        ...row,
      };
      return respondRows(req, res, [createdOrder]);
    }
    if (req.method === "GET") {
      // Success page reads the order back with its items nested.
      if (!createdOrder) return respondRows(req, res, []);
      return respondRows(req, res, [
        { ...createdOrder, order_items: createdItems },
      ]);
    }
  }

  if (path === "/rest/v1/order_items" && req.method === "POST") {
    const rows = Array.isArray(body) ? body : [body];
    createdItems = rows.map((r, i) => ({
      id: `item-${i}`,
      ...r,
    }));
    return respondRows(req, res, createdItems);
  }

  // Everything else the storefront layout touches (categories, products,
  // profiles...) resolves to empty rather than erroring the page.
  return respondRows(req, res, []);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[stub-supabase] listening on http://127.0.0.1:${PORT}`);
});
