import "server-only";
import { after } from "next/server";
import { eq, desc, and, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  deals,
  insertDealSchema,
  updateDealSchema,
} from "@/db/schema/tables";
import { errorResponse, validateJsonBody } from "./errors";
import { logActivity } from "./activity";

export async function listDeals(req: Request) {
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  const customerIdRaw = url.searchParams.get("customerId");
  const customerId = customerIdRaw ? Number(customerIdRaw) : null;

  const conditions: SQL[] = [];
  if (stage) conditions.push(eq(deals.stage, stage));
  if (customerId !== null && Number.isInteger(customerId)) {
    conditions.push(eq(deals.customerId, customerId));
  }

  const rows = await db
    .select()
    .from(deals)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(deals.createdAt));

  return Response.json(rows);
}

export async function createDeal(req: Request) {
  const body = await validateJsonBody(req, insertDealSchema);
  if (!body.ok) return body.response;

  const [row] = await db.insert(deals).values(body.data).returning();

  after(() =>
    logActivity({
      type: "deal_created",
      title: `New deal: ${row.title}`,
      description: `Deal "${row.title}" created in ${row.stage} stage`,
      relatedId: row.id,
    }),
  );

  return Response.json(row, { status: 201 });
}

export async function getDeal(_req: Request, params: { id: string }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return errorResponse("bad_id", "id must be integer", 400);
  const [row] = await db.select().from(deals).where(eq(deals.id, id));
  if (!row) return errorResponse("not_found", "deal not found", 404);
  return Response.json(row);
}

export async function updateDeal(req: Request, params: { id: string }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return errorResponse("bad_id", "id must be integer", 400);

  const body = await validateJsonBody(req, updateDealSchema);
  if (!body.ok) return body.response;

  const [row] = await db
    .update(deals)
    .set(body.data)
    .where(eq(deals.id, id))
    .returning();

  if (!row) return errorResponse("not_found", "deal not found", 404);

  // Activity log for stage changes — common CRM pattern.
  if (body.data.stage && body.data.stage !== row.stage) {
    after(() =>
      logActivity({
        type: "deal_stage_changed",
        title: `Deal "${row.title}" moved to ${row.stage}`,
        description: `Stage updated`,
        relatedId: row.id,
      }),
    );
  }

  return Response.json(row);
}

export async function deleteDeal(_req: Request, params: { id: string }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return errorResponse("bad_id", "id must be integer", 400);
  await db.delete(deals).where(eq(deals.id, id));
  return new Response(null, { status: 204 });
}
