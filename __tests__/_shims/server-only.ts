// No-op shim for vitest. The real `server-only` package throws when
// imported from a client bundle to enforce the RSC boundary; in tests
// we run server code directly in node and don't need the guard.
export {};
