"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Route-segment error boundary. Catches RSC + client errors thrown
 * below this point in the tree (the dashboard and its children).
 *
 * Reset re-renders the segment. Use it for transient errors (DB blip,
 * timeout). For persistent errors the user should reload manually.
 *
 * Mirror this in any new route that has its own loading.tsx — they
 * pair: loading shows during fetch, error catches fetch failure.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error-tracking hook (Sentry, PostHog, etc.).
    console.error("[route-error]", error.digest, error.message, error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 py-16">
      <h2 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="text-muted-foreground">
        {error.message || "An unexpected error occurred while rendering this page."}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground font-mono">
          Error id: {error.digest}
        </p>
      ) : null}
      <div className="flex gap-2 pt-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
