#!/usr/bin/env node
/**
 * Post-codegen hook: append drizzle-zod re-exports to Orval's zod output.
 *
 * Why: react-hook-form + zodResolver forms need schemas named
 * `insertXxxSchema` / `updateXxxSchema` (drizzle-zod convention). Orval's
 * generated zod names follow OpenAPI operation ids (`CreateCustomerBody`,
 * `UpdateCustomerBody`, etc.) — different naming.
 *
 * The system prompt mentions both paths for different reasons, and the
 * LLM agent has landed on the failure mode of importing a drizzle-zod name
 * from the Orval path ("Export insertCustomerSchema doesn't exist in
 * target module"). Instead of trying to prompt-engineer the LLM into
 * always picking the right path, we make both paths work by re-exporting
 * drizzle-zod schemas from Orval's output.
 *
 * Runs as part of `npm run codegen`. Idempotent — re-runs overwrite the
 * appended block cleanly because orval's `clean: true` regenerates the
 * base file each time.
 */
import fs from "node:fs";
import path from "node:path";

const ZOD_FILE = path.resolve(process.cwd(), "lib/api-zod/generated/zod.ts");

if (!fs.existsSync(ZOD_FILE)) {
  console.error(
    `[append-zod] ${ZOD_FILE} does not exist — make sure orval runs before this script`,
  );
  process.exit(1);
}

const MARKER = "// ---- drizzle-zod re-exports (auto-appended by codegen) ----";
const current = fs.readFileSync(ZOD_FILE, "utf8");

if (current.includes(MARKER)) {
  console.log("[append-zod] re-export block already present, skipping");
  process.exit(0);
}

const block = `

${MARKER}
// react-hook-form + zodResolver forms expect validator names like
// insertCustomerSchema / updateCustomerSchema (drizzle-zod convention).
// Orval generates CreateCustomerBody / UpdateCustomerBody (OpenAPI
// operation-id convention). The system prompt references both paths;
// re-exporting from db/schema here means the LLM can import either way:
//
//   import { insertCustomerSchema } from "@/lib/api-zod/generated/zod"; // works
//   import { insertCustomerSchema } from "@/db/schema/tables";          // also works
//
// Symbol name collisions are impossible: Orval's output suffixes every
// name with Body/Params/Response, drizzle-zod suffixes with Schema.
export * from "@/db/schema/tables";
`;

fs.appendFileSync(ZOD_FILE, block);
console.log(
  `[append-zod] appended drizzle-zod re-exports to ${path.relative(process.cwd(), ZOD_FILE)}`,
);
