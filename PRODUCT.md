# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: Egyptian households buying home appliances, nationwide.** Arabic speakers choosing a fridge, washer, cooker, microwave, vacuum or water heater, usually a considered, high-ticket purchase where authenticity, the official warranty and how the appliance actually arrives decide the sale. Customers in any governorate are in scope; the delivery-distance limit in checkout is a pricing guard, not the market boundary.
- **Secondary: the shop's own staff** working the admin dashboard: confirming and moving orders through their status flow, recording payments, maintaining products and variant groups, and maintaining delivery pricing.

## Product Purpose

The online storefront of الحرمين جروب, an authorized home-appliance dealer with a physical store in ديرب نجم، الشرقية. It lets a customer anywhere in Egypt find a genuine appliance, see a delivery cost the shop will actually charge, and order it, either through checkout or by talking to the shop on WhatsApp.

Success is an order the shop can fulfil without losing money on it, at the price the customer was shown. When those two conflict, the site refuses to quote and hands the customer to a person rather than accepting a loss-making order.

## Positioning

Big chains (B.TECH, Awad Serag, Raya) are authorized dealers too, so authorization alone is table stakes. What they cannot truthfully claim:

- **A real local store with personal service.** A showroom at شارع الكنيسة، طريق الإبراهيمية، ديرب نجم, run by people the customer can visit, call or WhatsApp, not a call centre.
- **The shop's own delivery and installation.** The shop's own vehicle and handlers bring the appliance in and install it. The delivery price reflects that cost (a fixed base for loading and dispatch plus a per-km rate, per size tier, one trip per order).

## Operating Context

- **Store:** شارع الكنيسة، طريق الإبراهيمية، ديرب نجم، محافظة الشرقية. Hours: Saturday–Thursday 9:00 ص – 10:00 م; Friday 2:00 م – 10:00 م.
- **Channels:** the website, WhatsApp (the fallback whenever checkout cannot quote), phone, email and Facebook.
- **Payment:** cash on delivery (الدفع عند الاستلام), Vodafone Cash, InstaPay and bank transfer. Prepaid instructions are shown on the order page itself. Partial payment is normal: staff record each payment, and payment status is derived from those records, separately from order status.
- **Order flow (Arabic statuses):** قيد الانتظار → تم التأكيد → جاري التجهيز → تم الشحن → تم التوصيل → مرتجع, with ملغي available before shipping. Customers may cancel before تم الشحن.
- **Delivery:** quoted live on the product page and at checkout from the customer's governorate and locality, priced by distance from the store and the cart's largest size tier. Beyond the maximum quoted distance, the site stops quoting and sends the customer to WhatsApp.
- **Accounts:** checkout currently requires signing in. Guest checkout is disabled until it gets a proper access path (see CLAUDE.md, Known gaps).

## Capabilities and Constraints

- **Arabic-first, right-to-left, everywhere.** Every customer-facing and admin string is Arabic, including validation messages and statuses. Numerals are Latin. Currency is EGP, formatted by the one shared formatter.
- **Catalogue:** a small, curated catalogue (41 products as of August 2026) in a two-level category tree, organised by brand. One appliance sold in several finishes, sizes or components is a variant group, with a separate indexable page per variant.
- **Authorized brands:** Elaraby, Fresh, LG and Midea. The catalogue also carries Sharp and Tornado models, both made in Egypt by Elaraby. Whether the authorization explicitly covers them is unconfirmed, so do not state it until it is.
- **Not offered:** instalment plans (تقسيط) are not offered today. Do not advertise them.
- **Unconfirmed claims already in the site:** the site metadata says "أفضل متجر" and "أفضل الأسعار". No price-leadership or best-store claim was confirmed, so do not repeat or amplify them.
- **Open:**
  - The About page promises the customer can inspect the appliance before paying cash ("ادفع نقداً بعد استلام الطلب ومعاينته"). This was not confirmed during init.
  - How orders beyond the automatic quoting range are fulfilled (the shop's own trip or a carrier) is not recorded.

## Brand Commitments

- **Name:** الحرمين جروب. The Latin spelling varies across assets: "ALHARMAN" on the logo, "alharmaingroup" in the domain, "Alharmeen" in the repo. Do not standardise it without the owner.
- **Logo:** the client's existing mark is in `src/app/favicon.ico`: a gold triangular spiral on navy with "ALHARMAN — GROUP —". It is the owner's identity. Never replace or redraw it. Only a 128px raster exists; use the designer's vector when one is supplied.
- **Arabic wordmark:** `BrandWordmark` (`src/shared/components/brand/`) is the Arabic counterpart to the mark, not a new identity.
- **Voice (observed, not yet set as a rule):** plain and warm, mostly Modern Standard Arabic with light Egyptian touches ("عندك سؤال؟"), and "شريكك الموثوق" as the recurring promise.

## Evidence on Hand

The owner has the following, but none of it is in the repository yet. Request the originals; never substitute stock or generated stand-ins:

- Official dealer certificates or authorization letters from the brands.
- Real customer reviews or testimonials.
- Photos of the store, the team and deliveries.

In the repository: product photography in Supabase Storage and `public/images/` (hero and refrigerator shots), the logo (`src/app/favicon.ico`, `public/logo.png`), and the store address, hours and contact details.

**Not on hand, so never fabricate:** star ratings, review counts, years in business, customer or order counts, sales figures, and press. The storefront emits no review or rating structured data. Keep it that way until real reviews are wired in.

## Product Principles

1. **Claim only what can be shown.** Authorization, warranty and service claims are backed by the real certificates, reviews and photos once supplied. Nothing is invented to fill a gap.
2. **A real shop behind every page.** The store, its people and a direct line to them (WhatsApp, phone) are part of the product, not a footer detail.
3. **The price shown is the price charged.** Totals and delivery are computed the same way the server charges them. When the shop cannot quote honestly, it says so and hands over to a person.
4. **Delivery is part of the sale.** The shop's own delivery and installation are its edge, so delivery cost, range and handling are first-class information, not checkout fine print.
5. **Arabic is the original, not a translation.** Copy is written in Arabic for Egyptian shoppers, right-to-left in every surface, including admin.
