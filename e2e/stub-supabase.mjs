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

  if (path === "/rest/v1/orders") {
    if (req.method === "POST") {
      const row = Array.isArray(body) ? body[0] : body;
      createdOrder = {
        id: ORDER_ID,
        order_number: ORDER_NUMBER,
        created_at: new Date().toISOString(),
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
