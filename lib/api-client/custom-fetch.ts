/**
 * Custom fetch mutator used by the orval-generated React Query hooks.
 *
 * - On the browser: relative paths like `/api/customers` work via the page origin.
 * - On the server (RSC prefetch, route handlers, server actions): relative paths
 *   don't work — we resolve them against `VERCEL_URL` or `NEXT_PUBLIC_SITE_URL`
 *   so server-side hydration prefetches succeed.
 */

export class ApiError<T = unknown> extends Error {
  status: number;
  data: T;
  constructor(status: number, data: T) {
    super(`API ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;

function resolveUrl(input: string): string {
  // Absolute URL passthrough
  if (/^https?:\/\//i.test(input)) return input;

  // Browser: relative path is fine
  if (typeof window !== "undefined") return input;

  // Server: we need an absolute URL
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return `${base}${input.startsWith("/") ? "" : "/"}${input}`;
}

/**
 * Mutator signature expected by orval (react-query client, split mode).
 * Receives `url` + `options` separately.
 */
export async function customFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json, application/problem+json");

  // Decide caching:
  // - Mutations (POST/PATCH/PUT/DELETE) MUST never be cached
  // - GETs default to Next.js Data Cache (caller can override per-request)
  // React Query handles browser-side cache; Next.js handles server-side
  // cache. Hardcoding `cache: "no-store"` here disables both layers.
  const method = (options.method ?? "GET").toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD";
  const cache: RequestCache | undefined =
    options.cache ?? (isMutation ? "no-store" : undefined);

  const response = await fetch(resolveUrl(url), {
    ...options,
    headers,
    ...(cache ? { cache } : {}),
  });

  // No body
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json") || contentType.includes("+json");

  if (!response.ok) {
    const errorBody = isJson ? await response.json().catch(() => ({})) : await response.text().catch(() => "");
    throw new ApiError(response.status, errorBody);
  }

  if (!isJson) {
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}
