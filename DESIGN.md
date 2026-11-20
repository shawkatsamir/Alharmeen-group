---
name: الحرمين جروب
description: Arabic-first storefront of an authorized home-appliance dealer in Egypt.
colors:
  primary: "oklch(0.42 0.128 255)"
  primary-hover: "oklch(0.36 0.124 255)"
  primary-soft: "oklch(0.955 0.021 254)"
  primary-foreground: "oklch(0.99 0.003 250)"
  accent: "oklch(0.79 0.148 76)"
  accent-hover: "oklch(0.73 0.152 70)"
  accent-soft: "oklch(0.965 0.036 84)"
  accent-foreground: "oklch(0.245 0.045 70)"
  sale: "oklch(0.575 0.213 27.5)"
  sale-soft: "oklch(0.96 0.026 25)"
  sale-foreground: "oklch(0.99 0.003 250)"
  success: "oklch(0.545 0.118 162)"
  success-soft: "oklch(0.955 0.032 165)"
  background: "oklch(0.985 0.002 250)"
  surface: "oklch(0.975 0.004 250)"
  surface-raised: "oklch(1 0 0)"
  surface-sunken: "oklch(0.955 0.006 250)"
  secondary: "oklch(0.962 0.007 250)"
  secondary-foreground: "oklch(0.275 0.035 265)"
  foreground: "oklch(0.205 0.028 265)"
  muted-foreground: "oklch(0.525 0.026 258)"
  border: "oklch(0.918 0.008 253)"
  brand-navy: "oklch(0.224 0.054 259)"
  brand-gold: "oklch(0.706 0.108 74.5)"
  brand-gold-light: "oklch(0.861 0.11 85.3)"
  brand-gold-deep: "oklch(0.609 0.107 73.8)"
typography:
  display:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.333
  product-title:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.375
  price:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.556
    fontFeature: "lnum, tnum"
  body:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
    fontFeature: "lnum, tnum"
  prose-heading:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  prose:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
  micro:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "40px"
  section-lg: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "oklch(0.42 0.128 255 / 0.9)"
  button-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 24px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 24px"
  button-accent-hover:
    backgroundColor: "{colors.accent-hover}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-outline-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  button-ghost-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  card-product:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  badge-sale:
    backgroundColor: "{colors.sale}"
    textColor: "{colors.sale-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  badge-new:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  badge-unavailable:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  count-badge:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.full}"
    height: "18px"
    width: "18px"
    padding: "0 4px"
  chip-pill:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  chip-pill-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  tab-bar-item:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.micro}"
    height: "64px"
  tab-bar-item-active:
    textColor: "{colors.primary}"
  campaign-tile-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.2xl}"
    padding: "32px"
  campaign-tile-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.2xl}"
    padding: "32px"
  brand-hero:
    backgroundColor: "{colors.brand-navy}"
    textColor: "oklch(1 0 0)"
---

# Design System: الحرمين جروب

## Overview

**Creative North Star: "The Trusted Showroom"**

A bright, orderly shop floor. Every appliance is photographed whole on white and priced in plain figures, and the shop's navy-and-gold sign hangs over the door. The system has two layers and keeps them apart. The **shop floor** is the interface: cool near-white surfaces, Dealer Blue for structure and action, and Signal Amber for what should be noticed. The **sign** is the identity: ALHARMAN Navy and Gold, sampled from the client's logo, which appear only where the shop introduces itself (the wordmark and the brand hero slide).

Density is commerce-dense but calm. Product grids run two columns on a phone and four on desktop. UI body copy is 14px Cairo. Every surface is right-to-left, and a phone gets a fixed bottom tab bar. Hierarchy comes from size and weight inside one family, from 1px hairline borders and from tonal surfaces, not from heavy shadows or ornament. Motion is quiet and earned: each section fades up once as it enters, cards lift on hover, the cart count bumps when it changes, and the wordmark draws its gold rules and sweeps a single highlight. Under `prefers-reduced-motion: reduce` nothing moves and the hero stops autoplaying.

The system rejects three looks. **Flash-sale marketplace noise:** red banners, stacked countdowns and discounts shouted on every card. **Luxury-boutique distance:** gold on black and sparse prestige that makes a fridge feel out of reach. **Template SaaS defaults:** stock shadcn greys, purple gradients and accent-coloured hover flashes with nothing retail or Egyptian about them.

**Key Characteristics:**
- Two layers: shop-floor interface colour (blue, amber, cool white) and sign-over-the-door identity colour (navy, gold), never mixed.
- Arabic-first and RTL in every surface; Latin, lining, tabular numerals everywhere.
- One type family (Cairo); hierarchy by size and weight only.
- Flat at rest, lift on intent; hairline borders do the structural work.
- Products shown whole (`object-contain` on white), never cropped to fill.
- Motion is CSS-first, `motion-safe`, transform-only, and stops entirely under reduced motion.

## Colors

A cool, near-white shop floor with one confident blue, one warm amber, and a red reserved for urgency. The client's navy and gold sit above it as identity.

### Primary
- **Dealer Blue** (oklch(0.42 0.128 255)): the interface's voice. Primary buttons (أضف للسلة), prices on product cards, links, active navigation (the bottom-tab pill and the header nav underline), focus rings, list markers and heading rules in rich content. Hover deepens to **Dealer Blue Deep** (oklch(0.36 0.124 255)) on links and the "عرض الكل" link. The primary button itself drops to 90% opacity.
- **Dealer Blue Soft** (oklch(0.955 0.021 254)): the universal hover and selected tint. Ghost and outline buttons, menu rows, brand chips and category sheets all wash to it, and their text turns Dealer Blue.

### Secondary
- **Signal Amber** (oklch(0.79 0.148 76)) with **Amber Ink** text (oklch(0.245 0.045 70)): attention, not structure. The hero's shop buttons (تسوق العروض), the "جديد" badge, every count badge (cart, wishlist, bottom nav), the amber campaign tile, the hero's progress-dot fill, and the lower half of the section-heading bar. It hovers to **Amber Deep** (oklch(0.73 0.152 70)). **Amber Wash** (oklch(0.965 0.036 84)) backs rich-content callouts.

### Tertiary
- **Discount Red** (oklch(0.575 0.213 27.5)): urgency and loss. Discount badges (خصم ٪), offer countdowns, low-stock notes (متبقي قطعة واحدة فقط), the filled wishlist heart, and remove/destructive actions (it is the same value as `destructive`). **Discount Wash** (oklch(0.96 0.026 25)) backs soft urgency chips in the buy box.
- **Stock Green** (oklch(0.545 0.118 162)) with **Stock Green Wash** (oklch(0.955 0.032 165)): availability and confirmation only.

### Neutral
- **Showroom White** (oklch(0.985 0.002 250)): the page background, a barely cool white.
- **Floor Mist** (oklch(0.975 0.004 250)): content-page backgrounds (`surface`), one step below the page.
- **Display White** (oklch(1 0 0)): cards, the header, the bottom bar, menus, and the product photo well. Anything that holds a product is pure white.
- **Shelf Grey** (oklch(0.955 0.006 250)): sunken areas such as table heads, nested category rows and sub-panels.
- **Quiet Grey** (oklch(0.962 0.007 250)) with **Slate Ink** (oklch(0.275 0.035 265)): secondary buttons and the "غير متوفر" badge. Unavailable is absence, not urgency, so it is never red.
- **Ink Navy** (oklch(0.205 0.028 265)): body text. A blue-black, never pure black.
- **Muted Slate** (oklch(0.525 0.026 258)): brand lines, meta, subtitles, inactive tabs, placeholder text, and unavailable variant tiles (whose swatch dims to 55% while the text stays readable). It holds 4.5:1 on Display White, Shelf Grey and every soft wash; that is why it sits at 0.525 lightness rather than lighter.
- **Hairline** (oklch(0.918 0.008 253)): every border and input stroke.

### Identity (the sign over the door)
- **ALHARMAN Navy** (oklch(0.224 0.054 259)): the brand hero's field and the wordmark's letters on light surfaces.
- **ALHARMAN Gold** (oklch(0.706 0.108 74.5)), **Gold Light** (oklch(0.861 0.11 85.3)) and **Gold Deep** (oklch(0.609 0.107 73.8)): جروب and the rules in the wordmark (Deep on light surfaces, Gold on navy), the rotating brand names on the hero, and the wordmark's highlight sweep.

### Named Rules
**The Sign Over the Door Rule.** ALHARMAN Navy and Gold belong to the wordmark and the brand hero only. Interface colour is Dealer Blue and Signal Amber. A navy button or a gold border is a bug. The identity colours are not redefined for dark mode, because a logo does not change colour with the theme.

**The Red Means Urgency Rule.** Discount Red marks money or time running out, or something being lost: a discount, an offer clock, the last pieces in stock, a removal. It never colours a count, a section, a decoration or an unavailable variant. That is why count badges are amber and "غير متوفر" is grey.

**The Amber Is Not Hover Rule.** Hover and focus tints are Dealer Blue Soft. Amber fills only things that ask to be acted on or counted. shadcn's default `hover:bg-accent` made every header icon, menu row and select option flash amber; it does not come back. On the inverted footer, where a pale tint would glare, links brighten to white instead.

## Typography

**Display Font:** Cairo (with ui-sans-serif, system-ui, sans-serif), loaded as a variable font through `next/font` with Arabic and Latin subsets.
**Body Font:** Cairo, the same family.

**Character:** One rounded, open Arabic-Latin sans carries every role, from the hero headline to an 11px tab label. It reads friendly and legible on a phone, and its Latin digits sit naturally beside the Arabic.

### Hierarchy
- **Display** (700, 1.5rem rising to 3rem at `lg`, line-height 1.25): hero slide headlines only.
- **Headline** (700, 1.5rem rising to 1.875rem at `sm`, line-height 1.2): page titles (من نحن, اتصل بنا, listing pages).
- **Title** (700, 1.25rem rising to 1.5rem at `sm`, line-height 1.333): section headings, always with the section bar.
- **Product Title** (600, 0.875rem rising to 0.95rem, line-height 1.375, clamped to two lines): product cards.
- **Price** (700, 1.125rem, Dealer Blue): the card price. A struck-through old price sits beside it at 0.875rem in Muted Slate.
- **Body** (400–500, 0.875rem, line-height 1.43): the default for UI text, buttons (500), form fields and descriptions.
- **Prose Heading** (700, 1.25rem, line-height 1.4): h2 in product descriptions, in both renderers (`.rich-content` HTML and content blocks), with a 3px Dealer Blue inline-start rule. h3 steps down to 1.125rem/700.
- **Prose** (400, 1rem, line-height 1.85): `.rich-content` product descriptions.
- **Label** (500, 0.75rem): badges, brand names on cards, meta lines, the header's two-line descriptor and variant tile labels.
- **Micro** (500, or 700 when active, 0.6875rem / 11px): bottom-tab labels, card variant pills, variant-tile notes, countdown units, subcategory counts and count-badge digits. It is the floor for anything a person reads or taps: nothing functional goes below 11px, and putting a smaller size on this ramp would not make it legible.

### Named Rules
**The One Family Rule.** Cairo is the only typeface the site ships. Hierarchy comes from size and from the weights 500, 600 and 700, never from a second family. The wordmark is not type: it is outlined Kufam geometry, and the site loads no Kufam.

**The Latin Numerals Rule.** Prices, counts, quantities and dates use Latin digits, lining and tabular (`[dir="rtl"]` sets `lining-nums tabular-nums`). Money goes through `formatCurrency` and nothing else, because the `Intl` currency style emits Arabic-Indic digits.

**The Whole Word Rule.** Arabic is never split below the word to animate it. Per-letter spans break the cursive joining. Animate whole words (`RotatingWords`) or the outlined wordmark.

## Layout

The grid is Tailwind's centred `container` with 16px side gutters. Wide reading pages (About, Contact) narrow to `max-w-4xl`. Vertical rhythm comes from `Section`: 40px top and bottom on a phone, 48px from `md`, with the heading block 24px (32px from `md`) above its content.

Product grids run two columns on a phone, three from `md` and four from `lg`, with 16px gaps (24px from `lg`). Product rails scroll horizontally with the scrollbar hidden. Cards stretch to equal height, and their conditional rows (countdown, low stock) hold fixed-height slots so one card's state never reflows its neighbours.

The header is sticky with a `--header-h` of 4rem on a phone. At `lg` (1024px) it grows to 7.5rem with a second row of category navigation, and anything sticky below it (filters, the product anchor rail, the buy box) offsets by `--header-h` rather than guessing. Below `lg` a 64px bottom tab bar is fixed to the viewport with the safe-area inset added, and pages pad their bottom by the same amount (`pb-safe-nav`).

Logical properties (`ps-`, `border-s`, `inline-start`) are used so RTL is the default, not an override.

### Named Rules
**The One Section Rule.** Every homepage and listing block goes through `Section`. It owns the heading, the "عرض الكل" link, the rhythm and the scroll reveal, and the reveal is applied there once. It is never nested and never placed inside a horizontal rail, because the rail's `overflow-x` becomes the `view()` timeline and never advances.

## Elevation & Depth

The system is flat at rest and layered by tone. Cards, chips and inputs sit on Hairline borders against Showroom White. Depth comes from Display White over Floor Mist over Shelf Grey. Shadows appear as a response to state (hover, scroll, an open menu) and are tinted with the system's own ink rather than pure black where they are part of the brand. The sticky header and the bottom bar use 95% opaque white with a backdrop blur, so content slides under them softly.

### Shadow Vocabulary
- **Card Lift** (`box-shadow: 0 8px 28px -8px oklch(0.42 0.128 255 / 0.25)`, with `translateY(-2px)` and the border warming to 25% Dealer Blue): product card hover, over 200ms.
- **Header Settle** (`box-shadow: 0 10px 30px -18px oklch(0.205 0.028 265 / 0.35)`): grows in over the first 96px of scroll through a scroll-driven timeline. At the top of the page the header has no shadow.
- **Menu Float** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): the desktop category mega-menu and other floating panels.
- **Resting Hint** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): generic cards and the round quick-action buttons on a product photo.
- **Bottom Sheet Edge** (`box-shadow: 0 -4px 16px -8px rgb(0 0 0 / 0.2)`): the mobile sticky buy bar, lifted off the page from below.

### Named Rules
**The Flat-at-Rest Rule.** A surface earns a shadow only by being hovered, scrolled past or opened. A card at rest has a border, not a shadow.

## Shapes

Gently curved corners on a 10px base (`--radius`: 0.625rem). Buttons and inputs are 8px, info cards 10px, product-page panels and product cards 14px, and campaign tiles 18px. Full pills are reserved for things that are tokens or counts: chips, badges on the hero, count badges, colour swatches, variant pills, the "عرض الكل" link, carousel arrows and dots, and the bottom-tab indicator. Rectangular badges (خصم, جديد) stay 8px.

Recurring silhouettes:
- **The section bar:** a 6×24px fully rounded bar, a vertical Dealer Blue to Signal Amber gradient, set before every section title. It replaced a hard 4px border rule.
- **The inline-start rule:** a 3px Dealer Blue border on the reading side of prose headings and page titles: plain text, never a box. Callouts and quotes use a full 1px border at reduced strength over their wash instead (Amber at 40%).
- **The photo well:** a square, pure-white frame with the product `object-contain` and 16px of air, so the appliance is shown whole.

## Components

The feel is **sturdy and plain-spoken**: controls look like what they do, states are obvious, and nothing is decorated for its own sake.

### Buttons
- **Shape:** gently curved (8px), 14px medium text, 8px icon gap, 16px icons.
- **Primary:** Dealer Blue fill with near-white text, 36px tall (40px `lg` for add-to-cart and hero actions, 32px `sm`). Hover drops to 90% opacity.
- **Accent:** Signal Amber fill with Amber Ink text, 40px. Used for the one action that should pull hardest (تسوق العروض on the hero). Hover goes to Amber Deep.
- **Outline:** Showroom White with a Hairline border. Hover washes to Dealer Blue Soft, with the border at 30% Dealer Blue and the text Dealer Blue. On the navy hero it inverts to a 35% white border over transparent.
- **Ghost:** no fill. Hover is Dealer Blue Soft with Dealer Blue text; this is every icon button in the header.
- **Secondary:** Quiet Grey with Slate Ink, used disabled for "غير متوفر حالياً".
- **Focus / Press / Disabled:** a 3px Dealer Blue ring at 50%; a `motion-safe` press to `scale(0.97)`; 50% opacity with pointer events off.

### Chips and Badges
- **Discount badge:** Discount Red with white text, 12px medium, 8px corners ("خصم 15%"). It sits top-right on the photo, stacked above the other badges.
- **New badge:** Signal Amber with Amber Ink ("جديد"). Shown only when there is no discount.
- **Unavailable badge:** Quiet Grey with Slate Ink ("غير متوفر").
- **Soft variants** (`saleSoft`, `accentSoft`, `successSoft`): a wash background with the strong colour as text, for inline status.
- **Brand chips:** full pills on Display White with a Hairline border. Hover goes to Dealer Blue Soft with Dealer Blue text.
- **Variant pills and swatches:** 20px colour dots, or 11px text pills for non-colour axes. The current variant gets a Dealer Blue border and ring. Every swatch is a real link.

### Count Badge
The item count on the cart, wishlist and bottom-nav icons: an 18px amber pill with 11px bold Amber Ink digits and a 2px Display White ring that separates it from the icon. Above 99 it reads "99+". It is keyed on the count, so every change replays a 320ms bump (`scale` 1 → 1.35 → 1) on the system's settle curve. The keyframe does the overshoot; the easing never bounces. It is the visible answer to "did that add to my cart?".

### Cards / Containers
- **Product card:** 14px corners, Display White, a Hairline border, no resting shadow, and Card Lift on hover (the photo also scales to 1.04 over 300ms). It is laid out as the square photo well, then the brand (label, Muted Slate), the two-line title, swatches, price and old price, the fixed countdown and low-stock slots, and a full-width 40px add-to-cart that becomes a 44px quantity stepper once the item is in the cart. One stretched link from the title makes the whole card clickable. Wishlist and compare actions are always visible on touch and revealed on hover from `lg`.
- **Info cards (About, Contact):** 10px corners, Display White on Floor Mist, a Hairline border and 20–24px padding, with a 20px Dealer Blue icon over a semibold title.
- **Product-page panels (`ProductSection`):** 14px corners, Display White on Floor Mist, a Hairline border, 24px padding (32px from `lg`), and a bold title with the inline-start rule. What goes inside a panel is never another card: spec groups are ruled tables (Hairline top and bottom, zebra rows in Shelf Grey), the warranty leads the assurance panel as a row (a 44px Stock Green Wash circle holding the shield, then the title and terms), and the three service promises follow as an icon list under a Hairline divider. Related products sit on the page as an ordinary rail, never boxed.
- **Buy box:** one 14px panel, sticky from `lg`. Delivery estimate, stock state and highlights live inside it as plain rows between separators. In stock is a Stock Green Wash pill; unavailable is a Quiet Grey pill ("غير متوفر حالياً").
- **Generic `Card`:** 14px corners, a border and Resting Hint, 24px vertical padding. Used mainly in the admin.

### Inputs / Fields
- **Style:** a Hairline stroke, a Display White fill (`--input-background`, so a field reads as a field on the off-white page), 8px corners, 36px tall, 12px inline padding. Textareas and select triggers share it. In the dark admin the fill is `input` at 30%. Text is 16px on a phone (which prevents iOS zoom) and 14px from `md`. Placeholders are Muted Slate.
- **Focus:** the border shifts to Dealer Blue with a 3px ring at 50%.
- **Error / Disabled:** a Discount Red border with a 20% red ring, driven by `aria-invalid`. Disabled is 50% opacity and not-allowed.

### Navigation
- **Header:** sticky Display White at 95% with a backdrop blur and a Hairline bottom border. It carries the wordmark (40px tall, subtle intro) beside a two-line descriptor in 12px Muted Slate, search on desktop, and ghost icon buttons with count badges. At `lg` a second row holds the categories, centred with 32px gaps. Each category link draws a 2px Dealer Blue underline from the right on hover and opens a 256px mega-menu: 10px corners, a Hairline border, Menu Float, and rows that wash to Dealer Blue Soft and indent on hover. The link's underline, not a coloured edge on the panel, ties the two together.
- **Bottom tab bar (below `lg`):** 64px tall with five tabs (الرئيسية, الأقسام, المفضلة, حسابي, السلة), each a 24px icon over an 11px label. Inactive tabs are Muted Slate; the active one is Dealer Blue with a bold label and a 32×2px pill that grows in at the top edge. Icons press to `scale(0.9)`. The wishlist icon fills Discount Red when it has items. الأقسام opens a full-height categories sheet beneath the header.
- **Footer:** an inverted Ink Navy field (`bg-foreground`) with text at 75% white. Links brighten to full white on hover; social icons sit in 36px white/10 circles that step to white/20. Contact icons are Signal Amber markers, static, and the WhatsApp link is Stock Green Wash so it holds contrast on the dark field.

### Section Heading (signature)
The rounded blue-to-amber bar, then the title in bold Ink Navy, an optional Muted Slate subtitle aligned under the title text, and an "عرض الكل" pill link in Dealer Blue at the far end, with a chevron that nudges toward the reading direction on hover. It is the one heading pattern for homepage and listing blocks.

### Brand Wordmark (signature)
الحرمين جروب as outlined vector paths (Kufam via harfbuzz: wght 800 for الحرمين, 600 for جروب), so the joins come from the font's own shaping. The `brand` tone puts ALHARMAN Navy letters with Gold Deep جروب and rules on light surfaces, turning white in the dark admin. The `inverse` tone puts white letters with Gold جروب on navy. The `subtle` intro (header) keeps the letters still while the gold rules grow out from جروب and one light sweep crosses. The `full` intro (brand hero) wipes the letters in right to left in reading order, then جروب, the rules and the sweep. Hovering or focusing its link replays the sweep. Regenerate the paths; never hand-edit them.

### Hero Carousel (signature)
- **Brand slide (first):** an ALHARMAN Navy field with two slowly drifting blurred lights (gold and blue) and, at `lg`, a faint 6% wordmark filling the far half. In front sit the wordmark (80–128px, full intro), the page's `<h1>` (the dealer claim, with no kicker above it), the brand names rotating word by word in Gold Light, and an amber primary action beside a white outline secondary.
- **Photo slides:** the photograph is `object-cover`, pushing in slowly to 1.06 while active, under a black scrim that runs bottom-up on a phone and from the reading side on desktop. White copy sits in a 36rem column: a display headline, a short description and an amber action.
- **Controls:** 44px frosted round arrows (white/15 with a blur) and progress dots that fill right to left over the autoplay interval.
- **Entrance:** each slide's copy rises in (650ms, staggered by `animation-delay`) every time the slide becomes active, through `data-active`. Under reduced motion the carousel does not autoplay.

### Campaign Tiles
A pair of typographic banners, one Dealer Blue and one Signal Amber, with 18px corners and 24px padding (32px from `sm`). Each holds a bold title, a short body at 90% opacity and an arrow action. Two soft white circles bleed off the corner and swell on hover while the tile lifts. They need no artwork; images can replace the circles without changing the layout.

## Do's and Don'ts

### Do:
- **Do** keep ALHARMAN Navy and Gold for the wordmark and the brand hero, and build every control from Dealer Blue, Signal Amber and the neutrals (The Sign Over the Door Rule).
- **Do** hover ghost and outline controls to Dealer Blue Soft with Dealer Blue text.
- **Do** show appliances whole: a square pure-white well, `object-contain`, 16px of air.
- **Do** run every homepage and listing block through `Section`, and let it apply `reveal` once.
- **Do** write every animation `motion-safe:` or inside `prefers-reduced-motion: no-preference`, put scroll-driven effects behind `@supports`, and write scroll timelines as longhands (the `animation` shorthand resets `animation-timeline`).
- **Do** animate `transform` in keyframes; reveal ranges are lengths (`entry 0px entry 220px`), not percentages.
- **Do** route item counts through `CountBadge` and money through `formatCurrency`.
- **Do** use logical properties (`ps-`, `border-s`, `inline-start`) so RTL is the default.
- **Do** reserve fixed-height slots for conditional card rows so a rail never reflows.

### Don't:
- **Don't** let the site look like a flash-sale marketplace: no red banners, no stacked countdowns, no discount shouted on every card.
- **Don't** drift into luxury-boutique gold-on-black; gold is the sign, not the shop floor.
- **Don't** ship template SaaS defaults: no stock shadcn greys, no purple gradients, no `hover:bg-accent` flashing amber.
- **Don't** use Discount Red for counts, sections or decoration; it marks urgency, discounts and removals only.
- **Don't** split Arabic into per-letter spans to animate it.
- **Don't** animate the `translate` or `scale` properties in a keyframe; a filled animation on them silently kills every Tailwind hover lift.
- **Don't** put `reveal` inside a horizontal rail or nest it inside a `Section`.
- **Don't** replace, redraw or approximate the ALHARMAN mark, and don't add the triangle mark to the lockup until the designer's vector is supplied.
- **Don't** add a second typeface, or Arabic-Indic digits in prices and counts.
- **Don't** give a resting card a shadow; borders carry structure, and shadows answer state.
- **Don't** run a one-sided bar down a rounded box (`border-r-4` on a card, callout or quote); use a full border and a wash, and let the leading icon carry the meaning.
- **Don't** put an eyebrow, kicker or tag pill above a heading; the heading carries its own weight.
- **Don't** nest a card inside a card. Inside a panel, use rows, dividers, ruled tables and icon lists.
- **Don't** set functional text below 11px.
