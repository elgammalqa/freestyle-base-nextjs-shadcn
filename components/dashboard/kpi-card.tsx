"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string;
  isLoading: boolean;
  icon: React.ReactNode;
  emphasis?: "primary" | "emerald";
};

/**
 * rerender-no-inline-components: KpiCard is file-level, not inline inside
 * DashboardView. Keeps memoization stable and readability high.
 *
 * rendering-conditional-render: uses `isLoading ? A : B` ternary, never
 * `isLoading && <Skeleton />` — `&&` on a non-boolean (e.g. `customers.length`)
 * leaks `0` or `""` into the DOM.
 */
export function KpiCard({ title, value, isLoading, icon, emphasis }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-[120px]" />
        ) : (
          <div
            className={cn(
              "text-2xl font-bold",
              emphasis === "primary" && "text-primary",
              emphasis === "emerald" && "text-emerald-600",
            )}
          >
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
