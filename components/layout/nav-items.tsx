import { Home, type LucideIcon } from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for app navigation. To change nav, edit THIS file.
 * The LLM does not need to touch AppShell or the sheet to add/rename links.
 *
 * Starts with just Home — add entries as your app grows, e.g.:
 *   { name: "Tasks", href: "/tasks", icon: ListTodo },
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { name: "Home", href: "/", icon: Home },
];
