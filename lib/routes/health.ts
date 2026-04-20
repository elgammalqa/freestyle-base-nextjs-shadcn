import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Liveness probe with a real DB ping. Returns 200 only when:
 *   - the route handler runs (Next.js process alive)
 *   - the Neon connection is reachable
 *   - a trivial SELECT 1 returns within ~2s
 *
 * Vercel platform monitors, the agent's apiSmokeTool, and any uptime
 * service should hit this. Returning 200 from a stub healthz when the
 * DB is down is the textbook way to ship false uptime.
 */
export async function healthCheck() {
  const startedAt = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      status: "ok",
      db: "ok",
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        status: "degraded",
        db: "down",
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
