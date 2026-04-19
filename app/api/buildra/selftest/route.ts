import "server-only";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Self-diagnostic endpoint used by the Buildra sandbox preflight and by
// users who want to know why their preview is broken. Returns JSON:
//   { ok: boolean, checks: [{ name, ok, detail? }] }
// 200 when everything passes, 503 when any check fails so the harness
// can auto-heal (re-run codegen / db:push / restart) without needing a
// human in the loop.

export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail?: string };

async function checkDatabaseUrl(): Promise<Check> {
  const url = process.env.DATABASE_URL;
  return {
    name: "DATABASE_URL configured",
    ok: !!url,
    detail: url ? undefined : "missing — .env.local is not populated. Run scaffold or export manually.",
  };
}

async function checkTablesExist(): Promise<Check[]> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return [
      { name: "customers table reachable", ok: false, detail: "skipped — DATABASE_URL not set" },
      { name: "deals table reachable", ok: false, detail: "skipped — DATABASE_URL not set" },
    ];
  }
  try {
    const sql = neon(url);
    const rows = (await sql`
      SELECT to_regclass('public.customers')::text AS customers,
             to_regclass('public.deals')::text AS deals
    `) as Array<{ customers: string | null; deals: string | null }>;
    const row = rows[0] ?? { customers: null, deals: null };
    return [
      {
        name: "customers table reachable",
        ok: row.customers === "customers",
        detail: row.customers ? undefined : "run `npm run db:push`",
      },
      {
        name: "deals table reachable",
        ok: row.deals === "deals",
        detail: row.deals ? undefined : "run `npm run db:push`",
      },
    ];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [
      { name: "customers table reachable", ok: false, detail: message },
      { name: "deals table reachable", ok: false, detail: message },
    ];
  }
}

async function checkCodegenOutputLoadable(): Promise<Check[]> {
  const checks: Check[] = [];

  const apiClient = await import("@/lib/api-client/generated/api")
    .then(() => ({ ok: true as const }))
    .catch((err: unknown) => ({
      ok: false as const,
      detail: err instanceof Error ? err.message : String(err),
    }));
  checks.push({
    name: "lib/api-client/generated loadable",
    ok: apiClient.ok,
    detail: apiClient.ok ? undefined : `${apiClient.detail ?? ""} — run \`npm run codegen\``,
  });

  const zod = await import("@/lib/api-zod/generated/zod")
    .then(() => ({ ok: true as const }))
    .catch((err: unknown) => ({
      ok: false as const,
      detail: err instanceof Error ? err.message : String(err),
    }));
  checks.push({
    name: "lib/api-zod/generated loadable",
    ok: zod.ok,
    detail: zod.ok ? undefined : `${zod.detail ?? ""} — run \`npm run codegen\``,
  });

  return checks;
}

async function checkSchemaExports(): Promise<Check> {
  try {
    const mod = (await import("@/db/schema/tables")) as Record<string, unknown>;
    const expected = [
      "customers",
      "insertCustomerSchema",
      "updateCustomerSchema",
      "deals",
      "insertDealSchema",
      "updateDealSchema",
    ];
    const missing = expected.filter((sym) => !(sym in mod));
    return {
      name: "db/schema/tables exports intact",
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? undefined
          : `missing: ${missing.join(", ")} — restore db/schema/tables.ts (should be \`export *\` per entity)`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: "db/schema/tables exports intact", ok: false, detail: message };
  }
}

export async function GET() {
  const [envCheck, tableChecks, codegenChecks, schemaCheck] = await Promise.all([
    checkDatabaseUrl(),
    checkTablesExist(),
    checkCodegenOutputLoadable(),
    checkSchemaExports(),
  ]);

  const checks: Check[] = [envCheck, ...tableChecks, ...codegenChecks, schemaCheck];
  const ok = checks.every((c) => c.ok);

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
