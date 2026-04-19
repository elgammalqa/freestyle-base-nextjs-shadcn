import {
  LayoutDashboard,
  Users,
  Briefcase,
  KanbanSquare,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for app navigation. To change nav, edit THIS file.
 * The LLM does not need to touch AppShell or the sheet to add/rename links.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Deals", href: "/deals", icon: Briefcase },
  { name: "Pipeline", href: "/pipeline", icon: KanbanSquare },
];
