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
  await page.getByLabel("المحافظة").fill("القاهرة");
  await page.getByLabel("المدينة / الحي").fill("مدينة نصر");
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

  // Totals are derived from the cart, not trusted from the client form.
  expect(order.subtotal).toBe(CART_ITEM.price * CART_ITEM.quantity);
  expect(order.total).toBe(CART_ITEM.price * CART_ITEM.quantity);

  expect(order.customer_name).toBe("محمد عبد الرحمن");
  expect(order.shipping_governorate).toBe("القاهرة");
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
  await page.getByLabel("المحافظة").fill("الجيزة");
  await page.getByLabel("المدينة / الحي").fill("الدقي");
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
  await page.getByLabel("المحافظة").fill("الإسكندرية");
  await page.getByLabel("المدينة / الحي").fill("سموحة");
  await page.getByLabel("العنوان بالتفصيل").fill("8 شارع فوزي معاذ");

  await page.getByRole("button", { name: "تأكيد الطلب" }).click();
  await page.waitForURL(/\/order-success\//);

  const writes = await captured(request);
  const historyWrites = writes.filter((r) =>
    r.path.startsWith("/rest/v1/order_status_history"),
  );
  expect(historyWrites).toHaveLength(0);
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
