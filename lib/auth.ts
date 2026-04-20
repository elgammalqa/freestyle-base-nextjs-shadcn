import "server-only";

/**
 * Auth seam. Today: stub that returns an anonymous session.
 *
 * When you wire real auth (next-auth, lucia, clerk, custom), replace
 * the body of `getSession` and every route handler that already imports
 * `getSession` from this module will start enforcing auth — no other
 * changes needed.
 *
 * Wire-up checklist for real auth:
 *   1. Replace getSession() body with your provider's session lookup
 *   2. Update middleware.ts to redirect unauthenticated users from
 *      protected pages
 *   3. Add `if (!session.isAuthenticated) return errorResponse("unauthorized", ...)`
 *      at the top of mutation route handlers
 *   4. Pass `session.userId` to insert queries that have a userId column
 */
export type Session = {
  userId: string;
  isAuthenticated: boolean;
};

export async function getSession(): Promise<Session> {
  return { userId: "anon", isAuthenticated: false };
}

/**
 * Throws a 401 Response if the request is not authenticated. Use at the
 * top of mutation route handlers:
 *
 *   const session = await requireAuth();   // throws Response
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session.isAuthenticated) {
    throw Response.json(
      { error: { code: "unauthorized", message: "Sign in to continue" } },
      { status: 401 },
    );
  }
  return session;
}
