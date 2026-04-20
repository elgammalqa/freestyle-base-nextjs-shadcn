import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streaming loading fallback for the dashboard route group. Shown
 * instantly on navigation so users see structure, not a blank screen,
 * while RSC + data prefetch resolve.
 *
 * Mirror this in any new route that performs a server-side fetch:
 * just create `app/<route>/loading.tsx` next to the page.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
