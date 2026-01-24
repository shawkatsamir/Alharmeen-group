import {
  Home,
  ShoppingCart,
  Users,
  Ticket,
  Layers,
  CreditCard,
  Star,
  Plus,
  Image as ImageIcon,
  List,
  MessageSquare,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: "لوحة التحكم", href: "/admin" },
    {
      icon: ShoppingCart,
      label: "إدارة الطلبات",
      href: "/admin/orders",
    },
    { icon: Users, label: "العملاء", href: "/admin/customers" },
    { icon: Ticket, label: "كوبونات الخصم", href: "/admin/coupons" },
    { icon: Layers, label: "التصنيفات", href: "/admin/categories" },
    { icon: CreditCard, label: "المعاملات", href: "/admin/transactions" },
    { icon: Star, label: "العلامات التجارية", href: "/admin/brands" },
  ];

  const productItems = [
    { icon: Plus, label: "إضافة منتج", href: "/admin/products/add" },
    { icon: ImageIcon, label: "وسائط المنتج", href: "/admin/products/media" },
    { icon: List, label: "قائمة المنتجات", href: "/admin/products" },
    {
      icon: MessageSquare,
      label: "مراجعات المنتجات",
      href: "/admin/products/reviews",
    },
  ];

  const adminItems = [
    { icon: User, label: "أدوار المسؤولين", href: "/admin/roles" },
    { icon: Shield, label: "الصلاحيات", href: "/admin/permissions" },
  ];

  // if (!open) return null; // Removed to support collapsed state

  const renderNavItem = (item: {
    icon: React.ElementType;
    label: string;
    href: string;
  }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        } ${!open ? "justify-center px-2" : ""}`}
      >
        <Icon className="w-5 h-5 min-w-[20px]" />
        {open && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div
      className={`bg-card border-l border-border flex flex-col h-full transition-all duration-300 ${open ? "w-64" : "w-20"}`}
    >
      {/* Logo */}
      <div
        className={`p-6 flex items-center justify-between border-b border-border ${!open ? "px-4 justify-center" : ""}`}
      >
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {open && (
              <div>
                <span className="font-bold text-primary">الحرمين</span>
              </div>
            )}
          </div>
        </Link>
        {open ? (
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-6">
          {/* Main Menu */}
          <div>
            {open && (
              <h3 className="text-xs font-medium text-muted-foreground uppercase px-3 mb-3">
                القائمة الرئيسية
              </h3>
            )}
            <nav className="space-y-1">{menuItems.map(renderNavItem)}</nav>
          </div>

          {/* Product */}
          <div>
            {open && (
              <h3 className="text-xs font-medium text-muted-foreground uppercase px-3 mb-3">
                المنتجات
              </h3>
            )}
            <nav className="space-y-1">{productItems.map(renderNavItem)}</nav>
          </div>

          {/* Admin */}
          <div>
            {open && (
              <h3 className="text-xs font-medium text-muted-foreground uppercase px-3 mb-3">
                الإدارة
              </h3>
            )}
            <nav className="space-y-1">{adminItems.map(renderNavItem)}</nav>
          </div>
        </div>
      </div>

      {/* Footer Toggle (Optional, or keep it in header? The design usually has toggle in header or sidebar) 
          The user replaced the header toggle with "Menu" icon. 
          But the Sidebar has a toggle inside it in `src/features/admin/components/Sidebar.tsx` at line 97.
          I kept it in the `open` block above.
          But if I collapse it, the button disappears?
          If the sidebar is collapsed, we need a way to expand it FROM the sidebar if the header button isn't the only way.
          The user said: "toggle so on clicking the ChevronLeft button it already toggle it but i want to only display icons... and the icon should be swaped to ChevronRight".
          This implies the toggle button stays visible in the sidebar even when collapsed?
          If so, I should move the toggle button out of the `open` check or make it visible in collapsed state.
          But the design often puts the toggle in the header for mobile, and sidebar-footer or header for desktop.
          Currently sidebar has a toggle at the top next to logo.
          If `open` is false (collapsed), logo is just icon.
          Where does the toggle go?
          If I hide it, how do they expand?
          Via the Header Menu button? Yes, `AdminLayout` has a Header Menu button.
          "Header > Menu icon".
          Let's assume the Sidebar's internal toggle is for Desktop mainly?
          If I leave it in the sidebar header, it takes space.
          If collapsed (w-20), `p-6` -> `p-4`.
          Flex row. Logo Icon + Button? Might be tight.
          Maybe move toggle to bottom or keep it but ensure it fits.
          Or, better, only use the Header toggle?
          User specifically mentioned "ChevronLeft button" in Sidebar.
          So let's keep it.
          When collapsed: Logo Icon (left/right?) and Toggle Button.
          In RTL: Logo (Right), Toggle (Left).
          Width 20 (80px). 
          Icon 24px + Gap + Button 20px. Fits.
      */}
      {/* {!open && (
        <div className="p-4 border-t border-border flex justify-center">
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )} */}
    </div>
  );
}
