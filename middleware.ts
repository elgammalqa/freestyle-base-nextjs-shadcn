import { NextRequest, NextResponse } from "next/server";

/**
 * Origin-based CSRF check on state-changing requests to /api/*.
 *
 * Real users hit /api/customers via fetch from your own pages — same-origin,
 * Origin header matches Host. A CSRF attempt from an attacker page would
 * carry the attacker's Origin, which won't match.
 *
 * This is "good enough" CSRF for app-internal APIs that aren't exposed
 * publicly. If you publish your API for third-party consumers, swap this
 * for a token-based check (double-submit cookie or signed JWT).
 *
 * Safe methods (GET, HEAD, OPTIONS) are skipped — they're idempotent and
 * not state-changing.
 */
const STATE_CHANGING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function middleware(req: NextRequest) {
  if (!STATE_CHANGING.has(req.method)) return NextResponse.next();

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  // Server-to-server calls (no Origin header) are allowed — they don't
  // come from a browser. If you need to lock those down too, add a shared
  // secret check here.
  if (!origin) return NextResponse.next();

  if (!host) {
    return new NextResponse("Bad Request: missing Host header", { status: 400 });
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return new NextResponse("Forbidden: malformed Origin", { status: 403 });
  }

  if (originHost !== host) {
    return new NextResponse(
      `Forbidden: cross-origin ${req.method} (origin=${originHost}, host=${host})`,
      { status: 403 },
    );
  }

  return NextResponse.next();
}

// Run only on /api/* paths. Static assets, RSC payloads, and pages skip
// this middleware entirely.
export const config = {
  matcher: ["/api/:path*"],
};
