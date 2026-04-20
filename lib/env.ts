import "server-only";
import { z } from "zod";

/**
 * Server-only environment validation. Imported at the top of lib/db.ts so
 * the app fails to boot with a useful per-field error if a required env
 * var is missing or malformed — instead of crashing on the first DB query
 * minutes later in production.
 *
 * NEXT_PUBLIC_* vars are intentionally NOT validated here (they're
 * inlined at build time and useless to validate at boot). Validate those
 * in a separate `lib/env-public.ts` if you need them.
 */
const ServerSchema = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a postgres:// URL — set it in .env.local")
    .refine((u) => u.startsWith("postgres"), "DATABASE_URL must use the postgres scheme"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = ServerSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Environment validation failed:\n${issues}\n\n` +
      "Fix the .env.local file (copy .env.example) and restart.",
  );
}

export const env = parsed.data;
