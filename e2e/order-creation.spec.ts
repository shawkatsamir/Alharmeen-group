import { expect, test } from "@playwright/test";
import { STUB_SUPABASE_URL } from "../playwright.config";

/**
 * End-to-end cover for the order creation flow.
 *
 * The point of these assertions is the bug this suite was written for: an
 * unimported duplicate of createOrder wrote the English literal "pending",
 * which the `orders_status_check` constraint rejects. Checking the status the
 * app actually sends to PostgREST is what proves the live path is correct.
 */

const CART_ITEM = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "ثلاجة هيتاشي انفرتر 316 لتر",
  price: 25000,
  image: "https://example.test/fridge.jpg",
  slug: "hitachi-fridge-316",
  brand: "هيتاشي",
  quantity: 2,
};

type CapturedRequest = { method: string; path: string; body: unknown };

async function captured(request: {
  get: (u: string) => Promise<{ json: () => Promise<CapturedRequest[]> }>;
}) {
  const res = await request.get(`${STUB_SUPABASE_URL}/__captured`);
  return res.json();
}

test.beforeEach(async ({ page, request }) => {
  await request.get(`${STUB_SUPABASE_URL}/__reset`);

  // Seed the cart directly in the zustand persist store, so the test covers
  // checkout rather than re-testing the product pages.
  await page.addInitScript((item) => {
    window.localStorage.setItem(
      "cart-storage",
      JSON.stringify({ state: { items: [item] }, version: 0 }),
    );
  }, CART_ITEM);
});

test("places a guest order and lands on the success page", async ({
  page,
  request,
}) => {
  await page.goto("/checkout");

  await expect(
    page.getByRole("heading", { name: "إتمام الطلب" }),
  ).toBeVisible();

  await page.getByLabel("الاسم بالكامل").fill("محمد عبد الرحمن");
  await page.getByLabel("البريد الإلكتروني").fill("customer@example.test");
  await page.getByLabel("رقم الهاتف").fill("01001234567");
  await page.getByLabel("المحافظة").click();
  await page.getByRole("option", { name: "الشرقية" }).click();
  await page.getByLabel("المدينة / المركز").click();
  await page.getByRole("option", { name: "الزقازيق" }).click();
  await page
    .getByLabel("العنوان بالتفصيل")
    .fill("12 شارع عباس العقاد، الدور الثالث");

  await page.getByRole("button", { name: "تأكيد الطلب" }).click();

  await page.waitForURL(/\/order-success\//);
  await expect(
    page.getByRole("heading", { name: "تم استلام طلبك بنجاح!" }),
  ).toBeVisible();

  const writes = await captured(request);
  const orderInsert = writes.find(
    (r) => r.path === "/rest/v1/orders" && r.method === "POST",
  );
  expect(orderInsert, "the app must POST an order").toBeTruthy();

  const order = orderInsert!.body as Record<string, unknown>;

  // The whole point: the initial status is the Arabic value the DB check
  // constraint allows, never the English "pending".
  expect(order.status).toBe("قيد الانتظار");
  expect(order.status).not.toBe("pending");

  // Totals are recomputed on the server from the database, not trusted from
  // the client cart, and now include the governorate's shipping rate.
  // الزقازيق: 26.3 straight * 1.3 road factor = 34.2 km.
  // Large tier (inherited from the parent category): 120 + 34.2 * 8 = 393.6,
  // rounded up to the nearest 5.
  const EXPECTED_SHIPPING = 395;
  expect(order.subtotal).toBe(CART_ITEM.price * CART_ITEM.quantity);
  expect(order.shipping_cost).toBe(EXPECTED_SHIPPING);
  expect(order.total).toBe(
    CART_ITEM.price * CART_ITEM.quantity + EXPECTED_SHIPPING,
  );
  // Snapshotted so the trip can be reconstructed later.
  expect(order.shipping_distance_km).toBe(34.2);
  expect(order.delivery_tier).toBe("large");

  expect(order.customer_name).toBe("محمد عبد الرحمن");
  expect(order.shipping_governorate).toBe("الشرقية");
  expect(order.shipping_city).toBe("الزقازيق");
  // Cash on delivery is the default when the customer picks nothing else.
  expect(order.payment_method).toBe("cod");
  expect(order.payment_status).toBe("unpaid");
  // Guest checkout.
  expect(order.user_id).toBeNull();
});

test("writes order items matching the cart", async ({ page, request }) => {
  await page.goto("/checkout");

  await page.getByLabel("الاسم بالكامل").fill("سارة أحمد");
  await page.getByLabel("البريد الإلكتروني").fill("sara@example.test");
  await page.getByLabel("رقم الهاتف").fill("01112223334");
  await page.getByLabel("المحافظة").click();
  await page.getByRole("option", { name: "الشرقية" }).click();
  await page.getByLabel("المدينة / المركز").click();
  await page.getByRole("option", { name: "الزقازيق" }).click();
  await page.getByLabel("العنوان بالتفصيل").fill("5 شارع التحرير");

  await page.getByRole("button", { name: "تأكيد الطلب" }).click();
  await page.waitForURL(/\/order-success\//);

  const writes = await captured(request);
  const itemsInsert = writes.find(
    (r) => r.path === "/rest/v1/order_items" && r.method === "POST",
  );
  expect(itemsInsert, "the app must POST order items").toBeTruthy();

  const items = itemsInsert!.body as Record<string, unknown>[];
  expect(items).toHaveLength(1);
  expect(items[0].product_id).toBe(CART_ITEM.id);
  expect(items[0].quantity).toBe(CART_ITEM.quantity);
  expect(items[0].unit_price).toBe(CART_ITEM.price);
  expect(items[0].total_price).toBe(CART_ITEM.price * CART_ITEM.quantity);
});

test("never writes order_status_history from the app", async ({
  page,
  request,
}) => {
  // The `log_status_change_trigger` in Postgres is the sole writer. An app
  // insert here would duplicate the first timeline step — this is the
  // regression guard for the bug that motivated the whole change.
  await page.goto("/checkout");

  await page.getByLabel("الاسم بالكامل").fill("خالد منصور");
  await page.getByLabel("البريد الإلكتروني").fill("khaled@example.test");
  await page.getByLabel("رقم الهاتف").fill("01223334445");
  await page.getByLabel("المحافظة").click();
  await page.getByRole("option", { name: "الشرقية" }).click();
  await page.getByLabel("المدينة / المركز").click();
  await page.getByRole("option", { name: "الزقازيق" }).click();
  await page.getByLabel("العنوان بالتفصيل").fill("8 شارع فوزي معاذ");

  await page.getByRole("button", { name: "تأكيد الطلب" }).click();
  await page.waitForURL(/\/order-success\//);

  const writes = await captured(request);
  const historyWrites = writes.filter((r) =>
    r.path.startsWith("/rest/v1/order_status_history"),
  );
  expect(historyWrites).toHaveLength(0);
});

test("ignores prices tampered with in the browser cart", async ({
  page,
  request,
}) => {
  /*
   * The cart lives in localStorage, so its prices are attacker-controlled.
   * createOrder used to sum `item.price` straight from this payload, which
   * meant editing one number in devtools bought a 25,000 EGP fridge for 1.
   * The server now re-reads every price from `products`.
   */
  await page.addInitScript((item) => {
    window.localStorage.setItem(
      "cart-storage",
      JSON.stringify({ state: { items: [{ ...item, price: 1 }] }, version: 0 }),
    );
  }, CART_ITEM);

  await page.goto("/checkout");

  await page.getByLabel("الاسم بالكامل").fill("منى فتحي");
  await page.getByLabel("البريد الإلكتروني").fill("mona@example.test");
  await page.getByLabel("رقم الهاتف").fill("01556667778");
  await page.getByLabel("المحافظة").click();
  await page.getByRole("option", { name: "الشرقية" }).click();
  await page.getByLabel("المدينة / المركز").click();
  await page.getByRole("option", { name: "الزقازيق" }).click();
  await page.getByLabel("العنوان بالتفصيل").fill("3 شارع 9");

  await page.getByRole("button", { name: "تأكيد الطلب" }).click();
  await page.waitForURL(/\/order-success\//);

  const writes = await captured(request);
  const order = writes.find(
    (r) => r.path === "/rest/v1/orders" && r.method === "POST",
  )!.body as Record<string, unknown>;

  // The real catalogue price, not the 1 the browser sent.
  expect(order.subtotal).toBe(25000 * CART_ITEM.quantity);

  const items = writes.find(
    (r) => r.path === "/rest/v1/order_items" && r.method === "POST",
  )!.body as Record<string, unknown>[];
  expect(items[0].unit_price).toBe(25000);
});

test("records the chosen wallet payment method", async ({ page, request }) => {
  await page.goto("/checkout");

  await page.getByLabel("الاسم بالكامل").fill("ياسمين طارق");
  await page.getByLabel("البريد الإلكتروني").fill("yasmin@example.test");
  await page.getByLabel("رقم الهاتف").fill("01098765432");
  await page.getByLabel("المحافظة").click();
  await page.getByRole("option", { name: "الشرقية" }).click();
  await page.getByLabel("المدينة / المركز").click();
  await page.getByRole("option", { name: "الزقازيق" }).click();
  await page.getByLabel("العنوان بالتفصيل").fill("22 شارع الثورة");

  await page.getByRole("radio", { name: "فودافون كاش" }).check();

  // Choosing a prepaid method tells the customer what happens next, which is
  // the whole point of the flow: money first, then confirmation.
  await expect(
    page.getByText("سنتواصل معك على الهاتف أو واتساب لتأكيد الطلب بعد استلام"),
  ).toBeVisible();

  await page.getByRole("button", { name: "تأكيد الطلب" }).click();
  await page.waitForURL(/\/order-success\//);

  const writes = await captured(request);
  const order = writes.find(
    (r) => r.path === "/rest/v1/orders" && r.method === "POST",
  )!.body as Record<string, unknown>;

  expect(order.payment_method).toBe("vodafone_cash");
  // Still unpaid: payment_status is derived from the ledger by trigger and no
  // money has been recorded yet.
  expect(order.payment_status).toBe("unpaid");
});

test("refuses to quote a destination past the delivery radius", async ({
  page,
  request,
}) => {
  /*
   * الرمل is 193 km by road, past the 150 km limit. The shop stops quoting
   * rather than accepting a trip it loses money on — the customer gets a
   * contact prompt, and the order cannot be submitted.
   */
  await page.goto("/checkout");

  await page.getByLabel("المحافظة").click();
  await page.getByRole("option", { name: "الإسكندرية" }).click();
  await page.getByLabel("المدينة / المركز").click();
  await page.getByRole("option", { name: "الرمل" }).click();

  await expect(page.getByText(/خارج نطاق التوصيل/)).toBeVisible();

  const submit = page.getByRole("button", { name: "تأكيد الطلب" });
  await expect(submit).toBeDisabled();

  // Nothing may reach the database for an order we cannot fulfil.
  const writes = await captured(request);
  expect(
    writes.filter((r) => r.path === "/rest/v1/orders" && r.method === "POST"),
  ).toHaveLength(0);
});

test("redirects to the cart when there is nothing to check out", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cart-storage",
      JSON.stringify({ state: { items: [] }, version: 0 }),
    );
  });

  await page.goto("/checkout");
  await page.waitForURL(/\/cart$/);
});
