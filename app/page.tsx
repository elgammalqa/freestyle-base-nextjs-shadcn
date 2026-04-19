import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";
import {
  getDashboardSummary,
  getGetDashboardSummaryQueryKey,
  listCustomers,
  getListCustomersQueryKey,
} from "@/lib/api-client/generated/api";
import { DashboardView } from "@/components/dashboard/dashboard-view";

// Dashboard reads live DB state — never static.
export const dynamic = "force-dynamic";

// server-parallel-fetching: both prefetches fire in parallel via
// Promise.all. No waterfall on first paint.
export default async function DashboardPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: getGetDashboardSummaryQueryKey(),
      queryFn: () => getDashboardSummary(),
    }),
    queryClient.prefetchQuery({
      queryKey: getListCustomersQueryKey(),
      queryFn: () => listCustomers(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView />
    </HydrationBoundary>
  );
}
