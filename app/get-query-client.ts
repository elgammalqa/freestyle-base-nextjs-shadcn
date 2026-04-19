// Used by BOTH server (RSC prefetch) and client (Providers). Do NOT add
// `server-only` — isServer below branches per runtime.
import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000 },
      dehydrate: {
        // Dehydrate pending queries too, so the client resumes streaming
        // rather than re-fetching on hydration.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * advanced-init-once: singleton on the browser, fresh instance per-request
 * on the server. Never share a QueryClient across server requests — it
 * would leak cached data between users.
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
