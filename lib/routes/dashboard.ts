import "server-only";
import { and, count, eq, inArray, not, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, deals, DEAL_STAGES } from "@/db/schema/tables";

const ACTIVE_STAGES = DEAL_STAGES.filter(
  (s) => s !== "closed_won" && s !== "closed_lost",
) as unknown as string[];

export async function getDashboardSummary() {
  // async-parallel: all 4 queries fire concurrently — single Neon HTTP
  // round-trip for the server, not four sequential ones.
  const [pipelineValueRow, wonValueRow, activeDealsRow, customerCountRow] =
    await Promise.all([
      db
        .select({ value: sum(deals.value) })
        .from(deals)
        .where(inArray(deals.stage, ACTIVE_STAGES)),
      db
        .select({ value: sum(deals.value) })
        .from(deals)
        .where(eq(deals.stage, "closed_won")),
      db
        .select({ count: count() })
        .from(deals)
        .where(
          and(
            not(eq(deals.stage, "closed_won")),
            not(eq(deals.stage, "closed_lost")),
          ),
        ),
      db.select({ count: count() }).from(customers),
    ]);

  return Response.json({
    totalPipelineValue: Number(pipelineValueRow[0]?.value ?? 0),
    wonDealsValue: Number(wonValueRow[0]?.value ?? 0),
    activeDeals: Number(activeDealsRow[0]?.count ?? 0),
    totalCustomers: Number(customerCountRow[0]?.count ?? 0),
  });
}
