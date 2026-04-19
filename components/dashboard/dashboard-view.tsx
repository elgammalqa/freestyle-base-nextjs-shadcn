"use client";

import dynamic from "next/dynamic";
import {
  useGetDashboardSummary,
  useListCustomers,
} from "@/lib/api-client/generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { KpiCard } from "./kpi-card";

// bundle-dynamic-imports: recharts is ~90KB gzipped. Lazy-load it with a
// Skeleton fallback so initial paint is fast. ssr:false avoids hydration
// mismatches for client-only chart internals.
const DashboardCharts = dynamic(
  () => import("./dashboard-charts").then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
  },
);

export function DashboardView() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: customers } = useListCustomers();

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your sales pipeline and recent activity.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Pipeline Value"
          value={formatCurrency(summary?.totalPipelineValue ?? 0)}
          isLoading={isLoading}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          emphasis="primary"
        />
        <KpiCard
          title="Won Deals Value"
          value={formatCurrency(summary?.wonDealsValue ?? 0)}
          isLoading={isLoading}
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          emphasis="emerald"
        />
        <KpiCard
          title="Active Deals"
          value={String(summary?.activeDeals ?? 0)}
          isLoading={isLoading}
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Total Customers"
          value={String(summary?.totalCustomers ?? 0)}
          isLoading={isLoading}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <DashboardCharts />

      <Card>
        <CardHeader>
          <CardTitle>Recent Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {customers && customers.length > 0 ? (
            <ul className="divide-y">
              {customers.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.email}
                    </div>
                  </div>
                  {c.company ? (
                    <div className="text-sm text-muted-foreground">
                      {c.company}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No customers yet. Create your first one from the Customers page.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
