"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS } from "./nav-items";
import { NavList } from "./nav-list";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex min-h-[100dvh] w-full bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-card">
        <NavList items={NAV_ITEMS} activeHref={pathname} />
      </aside>

      <div className="lg:pl-64 flex flex-col flex-1 w-full max-w-full">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card px-4 sm:px-6 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-m-2.5 p-2.5 text-muted-foreground"
                aria-label="Open navigation"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavList items={NAV_ITEMS} activeHref={pathname} onNavigate={close} />
            </SheetContent>
          </Sheet>
          <div className="flex-1 text-sm font-semibold leading-6">
            Buildra App
          </div>
        </header>

        <main className="flex-1 w-full max-w-full overflow-x-hidden">
          <div className="h-full p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
