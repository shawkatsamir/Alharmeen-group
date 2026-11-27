import {
  CreditCard,
  Home,
  Image as ImageIcon,
  Layers,
  List,
  LayoutGrid,
  Plus,
  Shield,
  ShoppingCart,
  Star,
  Ticket,
  Truck,
  User,
  Users,
} from "lucide-react";

/**
 * Icons live here so `nav-items.ts` stays import-free and unit-testable, the
 * same split as `order-status.ts` / `order-status-icons.ts`.
 */
export const ADMIN_NAV_ICONS: Record<string, React.ElementType> = {
  home: Home,
  cart: ShoppingCart,
  truck: Truck,
  users: Users,
  ticket: Ticket,
  layers: Layers,
  card: CreditCard,
  star: Star,
  list: List,
  plus: Plus,
  group: LayoutGrid,
  image: ImageIcon,
  user: User,
  shield: Shield,
};
