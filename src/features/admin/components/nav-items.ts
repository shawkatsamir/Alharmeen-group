/**
 * The admin navigation, as data.
 *
 * Shared by the desktop rail and the phone drawer so the two can never drift
 * into different information architectures — the one thing an admin notices
 * immediately when they switch devices.
 *
 * `ready: false` marks a destination that has no route yet. Five of these were
 * plain links, which on a phone made the drawer — the only way to navigate —
 * half dead ends, with a 404 as the only feedback. They stay listed because
 * they record what is planned, but they are not tappable.
 */
export interface AdminNavItem {
  /** lucide icon name, resolved in `nav-icons.ts`. */
  icon: string;
  label: string;
  href: string;
  ready?: boolean;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    title: "القائمة الرئيسية",
    items: [
      { icon: "home", label: "لوحة التحكم", href: "/admin", ready: true },
      {
        icon: "cart",
        label: "إدارة الطلبات",
        href: "/admin/orders",
        ready: true,
      },
      { icon: "truck", label: "الشحن", href: "/admin/shipping", ready: true },
      { icon: "users", label: "العملاء", href: "/admin/customers", ready: true },
      {
        icon: "layers",
        label: "التصنيفات",
        href: "/admin/categories",
        ready: true,
      },
      { icon: "ticket", label: "كوبونات الخصم", href: "/admin/coupons" },
      { icon: "card", label: "المعاملات", href: "/admin/transactions" },
      { icon: "star", label: "العلامات التجارية", href: "/admin/brands" },
    ],
  },
  {
    title: "المنتجات",
    items: [
      {
        icon: "list",
        label: "قائمة المنتجات",
        href: "/admin/products",
        ready: true,
      },
      {
        icon: "plus",
        label: "إضافة منتج",
        href: "/admin/products/new",
        ready: true,
      },
      {
        icon: "group",
        label: "مجموعات المنتجات",
        href: "/admin/products/groups",
        ready: true,
      },
      {
        icon: "image",
        label: "وسائط المنتج",
        href: "/admin/products/media",
        ready: true,
      },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { icon: "user", label: "أدوار المسؤولين", href: "/admin/roles" },
      { icon: "shield", label: "الصلاحيات", href: "/admin/permissions" },
    ],
  },
];

/**
 * The page title for a pathname, so the phone header can say where you are.
 * Longest match wins, because `/admin/products/new` must not resolve to
 * `/admin/products`.
 */
export function adminPageTitle(pathname: string): string {
  const all = ADMIN_NAV.flatMap((section) => section.items);
  const exact = all.find((item) => item.href === pathname);
  if (exact) return exact.label;

  const prefixed = all
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (prefixed?.href === "/admin/products") return "تعديل منتج";
  return prefixed?.label ?? "لوحة التحكم";
}

/** Whether a nav item should render as the current page. */
export function isAdminNavActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/products") {
    // `/admin/products/new|groups|media` are their own entries.
    return pathname === "/admin/products" || /^\/admin\/products\/[^/]+\/edit$/.test(pathname);
  }
  return pathname === href;
}
