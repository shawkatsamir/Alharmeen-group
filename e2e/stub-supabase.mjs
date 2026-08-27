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
    // Unset on the product; inherited from the parent category, which is how
    // all 41 real products resolve.
    delivery_tier: null,
    category: { delivery_tier: null, parent: { delivery_tier: "large" } },
    brand: { name_ar: "هيتاشي" },
    images: [{ image_url: "https://example.test/fridge.jpg", is_primary: true }],
  },
];

/** Fallback flat rates — only reached when a locality has no distance. */
const GOVERNORATES = [
  {
    id: 1,
    name_ar: "الشرقية",
    shipping_cost: 50,
    is_deliverable: true,
    display_order: 1,
    updated_at: new Date().toISOString(),
    updated_by: null,
  },
  {
    id: 2,
    name_ar: "الإسكندرية",
    shipping_cost: 75,
    is_deliverable: true,
    display_order: 2,
    updated_at: new Date().toISOString(),
    updated_by: null,
  },
];

/**
 * Three destinations covering the cases that matter: at the shop, a normal
 * trip, and one past the 150 km radius where quoting stops.
 */
const LOCALITIES = [
  locality(1, 1, "ديرب نجم", 0),
  locality(2, 1, "الزقازيق", 26.3),
  locality(3, 2, "الرمل", 148.8), // 148.8 * 1.3 = 193.4 km, out of range
];

function locality(id, governorate_id, name_ar, straight_km) {
  return {
    id,
    governorate_id,
    name_ar,
    lat: null,
    lng: null,
    straight_km,
    distance_km_override: null,
    is_deliverable: true,
    coordinates_verified: false,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

/** Mirrors the seeded delivery_tiers rows. */
const DELIVERY_TIERS = [
  {
    key: "small",
    label_ar: "أجهزة صغيرة",
    base_fee: 40,
    per_km_rate: 4,
    min_fee: 40,
    max_fee: 500,
    display_order: 1,
    updated_at: new Date().toISOString(),
    updated_by: null,
  },
  {
    key: "large",
    label_ar: "أجهزة كبيرة",
    base_fee: 120,
    per_km_rate: 8,
    min_fee: 120,
    max_fee: 1500,
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
    const nameFilter = url.searchParams.get("name_ar");
    const rows = nameFilter?.startsWith("eq.")
      ? GOVERNORATES.filter(
          (g) => g.name_ar === decodeURIComponent(nameFilter.slice(3)),
        )
      : GOVERNORATES;
    return respondRows(req, res, rows);
  }

  if (path === "/rest/v1/localities" && req.method === "GET") {
    // createOrder looks one up with `.eq("id", ...).maybeSingle()`, so the
    // filter has to be honoured — returning all rows makes PostgREST's
    // single-object mode fail with PGRST116.
    const idFilter = url.searchParams.get("id");
    let rows = LOCALITIES;
    if (idFilter?.startsWith("eq.")) {
      rows = LOCALITIES.filter((l) => String(l.id) === idFilter.slice(3));
    }
    // The action embeds the parent governorate for the fallback rate.
    return respondRows(
      req,
      res,
      rows.map((l) => ({
        ...l,
        governorate: GOVERNORATES.find((g) => g.id === l.governorate_id) ?? null,
      })),
    );
  }

  if (path === "/rest/v1/delivery_tiers" && req.method === "GET") {
    return respondRows(req, res, DELIVERY_TIERS);
  }

  if (path === "/rest/v1/free_shipping_rules" && req.method === "GET") {
    // Seeded empty, matching the migration: free shipping off by default.
    return respondRows(req, res, []);
  }

  if (path === "/rest/v1/app_settings" && req.method === "GET") {
    // Free shipping disabled, so every order is charged its governorate rate.
    // Wallet numbers left blank, matching a freshly seeded project.
    return respondRows(req, res, [
      { key: "delivery_road_factor", value: 1.3 },
      { key: "max_delivery_km", value: 150 },
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
