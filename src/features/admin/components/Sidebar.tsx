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
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const handelLogOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

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

      {/* Logout Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handelLogOut}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:text-red-400 ${
            !open ? "justify-center px-2" : ""
          }`}
        >
          <LogOut className="w-5 h-5 min-w-[20px]" />
          {open && <span>تسجيل الخروج</span>}
        </button>
      </div>
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
