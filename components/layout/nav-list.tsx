"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Briefcase } from "lucide-react";
import type { NavItem } from "./nav-items";

type Props = {
  items: readonly NavItem[];
  activeHref: string;
  onNavigate?: () => void;
};

/**
 * rerender-no-inline-components: NavList is defined at file level, NOT
 * inline inside AppShell. Defining it inside AppShell would re-allocate
 * it on every render of the shell, forcing the nav subtree to reconcile.
 */
export function NavList({ items, activeHref, onNavigate }: Props) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Briefcase className="size-5" />
          </div>
          <span>Buildra App</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {items.map((item) => {
          const isActive =
            activeHref === item.href ||
            (item.href !== "/" && activeHref.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} onClick={onNavigate}>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-accent-foreground",
                  )}
                />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
