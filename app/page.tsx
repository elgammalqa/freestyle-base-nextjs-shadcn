import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";
import {
  getDashboardSummary,
  getGetDashboardSummaryQueryKey,
  listCustomers,
  getListCustomersQueryKey,
} from "@/lib/api-client/generated/api";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata("Dashboard", "Sales pipeline overview");

// Dashboard reads live DB state but tolerates 30s of staleness — using ISR
// instead of force-dynamic gives us cached HTML for back-to-back navigations
// while still refreshing at most every 30s. Mutations call revalidatePath.
export const revalidate = 30;

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
