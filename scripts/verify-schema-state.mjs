#!/usr/bin/env node
/**
 * Pre-flight guard for the codegen pipeline. Catches the two silent
 * failure modes that have bitten generated apps the most:
 *
 *   1. db/schema/tables.ts re-exports `./X` but db/schema/X.ts doesn't
 *      exist. Result: the entire lib/db.ts import tree fails to compile,
 *      every API route returns 500, every page that touches the DB
 *      breaks. Caught at request-time as "Module not found: Can't
 *      resolve './X'" — too late.
 *
 *   2. db/schema/X.ts exists but is NOT re-exported from tables.ts.
 *      Result: drizzle queries that reference X.foo work, but
 *      `import { insertXSchema } from "@/db/schema/tables"` returns
 *      undefined. Forms fail at runtime with cryptic Zod errors.
 *
 * Both errors are agent-introduced when generating new entities. The
 * agent is supposed to create db/schema/X.ts AND add the re-export AND
 * re-run codegen as one transaction — but the writeFile / replaceInFile
 * tools occasionally fail silently, leaving the repo half-mutated.
 *
 * This guard runs as part of `npm run codegen`. If state is broken the
 * codegen tool fails with a specific actionable message instead of the
 * agent discovering the problem 10 commits later via apiSmokeTool 500s.
 *
 * Exit codes:
 *   0 — schema state OK
 *   1 — at least one inconsistency, with per-issue details on stderr
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TABLES_PATH = "db/schema/tables.ts";
const SCHEMA_DIR = "db/schema";

if (!existsSync(TABLES_PATH)) {
  // No schema yet (e.g. very early in scaffold) — nothing to verify.
  process.exit(0);
}

const tablesContent = readFileSync(TABLES_PATH, "utf8");

// Strip line + block comments so commented-out re-exports don't trip
// the regex (the agent leaves stale ones behind during refactors).
const stripped = tablesContent
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((l) => l.replace(/\/\/.*$/, ""))
  .join("\n");

const reExportRegex = /export\s+\*\s+from\s+["']\.\/([^"']+)["']/g;
const reExportedNames = new Set();
const errors = [];

for (const match of stripped.matchAll(reExportRegex)) {
  const name = match[1];
  reExportedNames.add(name);

  // Allow `./X` to resolve to either ./X.ts or ./X/index.ts (mirrors
  // node module resolution).
  const candidates = [
    resolve(SCHEMA_DIR, `${name}.ts`),
    resolve(SCHEMA_DIR, name, "index.ts"),
  ];
  if (!candidates.some((p) => existsSync(p))) {
    errors.push(
      `${TABLES_PATH} re-exports "./${name}" but ${SCHEMA_DIR}/${name}.ts does not exist.\n` +
        `  Fix EITHER:\n` +
        `    1. Create ${SCHEMA_DIR}/${name}.ts with the table + insert${cap(name)}Schema + update${cap(name)}Schema, OR\n` +
        `    2. Remove the line \`export * from "./${name}";\` from ${TABLES_PATH}.\n` +
        `  This is the most common silent-failure: every API route 500s ` +
        `with "Module not found" until you fix it.`,
    );
  }
}

// Reverse direction: every db/schema/*.ts must be re-exported from tables.ts.
// Otherwise you have orphan tables that drizzle migrations create but the
// rest of the app can't import from "@/db/schema/tables".
const dirEntries = readdirSync(SCHEMA_DIR, { withFileTypes: true });
const schemaFiles = dirEntries
  .filter((d) => d.isFile() && d.name.endsWith(".ts") && d.name !== "tables.ts")
  .map((d) => d.name.replace(/\.ts$/, ""));

for (const name of schemaFiles) {
  if (!reExportedNames.has(name)) {
    errors.push(
      `${SCHEMA_DIR}/${name}.ts exists but is NOT re-exported from ${TABLES_PATH}.\n` +
        `  Add this line to ${TABLES_PATH}:\n` +
        `    export * from "./${name}";\n` +
        `  Without it, \`import { insert${cap(name)}Schema } from "@/db/schema/tables"\` ` +
        `returns undefined and every form using that schema fails at runtime.`,
    );
  }
}

if (errors.length > 0) {
  console.error("\n❌ Schema state invalid — fix before continuing:\n");
  for (const err of errors) {
    console.error(`  • ${err}\n`);
  }
  console.error(
    "These are the most common agent-introduced failure modes. " +
      "Fix the issue, then re-run \`npm run codegen\` (or your shipTool will catch it).\n",
  );
  process.exit(1);
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
