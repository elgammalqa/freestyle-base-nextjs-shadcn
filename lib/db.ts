import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema/tables";
import { env } from "@/lib/env";

// server-hoist-static-io: neon client created once at module scope, reused
// across every server invocation in this isolate. Do NOT recreate per-request.
// env.DATABASE_URL has been validated at boot via lib/env.ts.
const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export { schema };
