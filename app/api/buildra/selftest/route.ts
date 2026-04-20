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

/**
 * Data-layer CRUD roundtrip: insert → update → delete a throwaway row
 * on every starter table, using the same Drizzle client + validators the
 * route handlers use. Catches:
 *   - stale codegen with API/type drift
 *   - drizzle-zod schema mismatches with the live table shape
 *   - migration drift (schema defined in TS but not present on DB)
 *   - NOT NULL columns added to the schema but not enforced in validators
 *
 * Test rows use a stable `__buildra_selftest_` email prefix and are
 * always deleted at the end. Errors are surfaced per-entity.
 */
async function checkDataLayerRoundtrip(): Promise<Check[]> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return [
      { name: "customers CRUD roundtrip", ok: false, detail: "skipped — DATABASE_URL not set" },
      { name: "deals CRUD roundtrip", ok: false, detail: "skipped — DATABASE_URL not set" },
    ];
  }

  const [dbMod, schemaMod, drizzleMod] = await Promise.all([
    import("@/lib/db"),
    import("@/db/schema/tables"),
    import("drizzle-orm"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { db } = dbMod as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { customers, deals, insertCustomerSchema, updateCustomerSchema, insertDealSchema, updateDealSchema } = schemaMod as any;
  const { eq } = drizzleMod;

  const checks: Check[] = [];
  const tag = `__buildra_selftest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // ---- customers ----
  let customerId: number | null = null;
  try {
    const insertInput = insertCustomerSchema.parse({
      name: `Buildra Selftest ${tag}`,
      email: `${tag}@selftest.buildra.invalid`,
    });
    const [inserted] = await db.insert(customers).values(insertInput).returning();
    if (!inserted?.id) throw new Error("insert returned no row");
    customerId = inserted.id as number;

    const updateInput = updateCustomerSchema.parse({ name: `${insertInput.name} (updated)` });
    const [updated] = await db
      .update(customers)
      .set(updateInput)
      .where(eq(customers.id, customerId))
      .returning();
    if (!updated || updated.name !== updateInput.name) {
      throw new Error(`update did not persist (got name=${updated?.name})`);
    }

    await db.delete(customers).where(eq(customers.id, customerId));
    customerId = null;

    checks.push({ name: "customers CRUD roundtrip", ok: true });
  } catch (err) {
    checks.push({
      name: "customers CRUD roundtrip",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    if (customerId !== null) {
      await db.delete(customers).where(eq(customers.id, customerId)).catch(() => {});
    }
  }

  // ---- deals ----
  let dealId: number | null = null;
  try {
    const insertInput = insertDealSchema.parse({
      title: `Buildra Selftest Deal ${tag}`,
      value: "0",
      stage: "lead",
    });
    const [inserted] = await db.insert(deals).values(insertInput).returning();
    if (!inserted?.id) throw new Error("insert returned no row");
    dealId = inserted.id as number;

    const updateInput = updateDealSchema.parse({ stage: "qualified" });
    const [updated] = await db
      .update(deals)
      .set(updateInput)
      .where(eq(deals.id, dealId))
      .returning();
    if (!updated || updated.stage !== "qualified") {
      throw new Error(`update did not persist (got stage=${updated?.stage})`);
    }

    await db.delete(deals).where(eq(deals.id, dealId));
    dealId = null;

    checks.push({ name: "deals CRUD roundtrip", ok: true });
  } catch (err) {
    checks.push({
      name: "deals CRUD roundtrip",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    if (dealId !== null) {
      await db.delete(deals).where(eq(deals.id, dealId)).catch(() => {});
    }
  }

  return checks;
}

export async function GET() {
  const [envCheck, tableChecks, codegenChecks, schemaCheck] = await Promise.all([
    checkDatabaseUrl(),
    checkTablesExist(),
    checkCodegenOutputLoadable(),
    checkSchemaExports(),
  ]);

  // CRUD roundtrip runs serially after the structural checks so a failing
  // env/table check short-circuits the expensive DB writes.
  const crudChecks: Check[] =
    envCheck.ok && tableChecks.every((c) => c.ok)
      ? await checkDataLayerRoundtrip()
      : [
          { name: "customers CRUD roundtrip", ok: false, detail: "skipped — env or tables not ready" },
          { name: "deals CRUD roundtrip", ok: false, detail: "skipped — env or tables not ready" },
        ];

  const checks: Check[] = [envCheck, ...tableChecks, ...codegenChecks, schemaCheck, ...crudChecks];
  const ok = checks.every((c) => c.ok);

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
