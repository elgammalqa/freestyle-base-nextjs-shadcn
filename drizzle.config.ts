import { loadEnvConfig } from "@next/env";
import type { Config } from "drizzle-kit";

// drizzle-kit doesn't auto-load Next's .env.local across versions.
// @next/env is already a transitive of `next`, so we can use Next's
// canonical env loader here — works whether we invoke it from the
// scaffold or the LLM invokes it via npm run db:push.
loadEnvConfig(process.cwd());

export default {
  schema: "./db/schema/tables.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!,
  },
  strict: true,
} satisfies Config;
