import "server-only";
import { after } from "next/server";
import { eq, ilike, or, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  insertCustomerSchema,
  updateCustomerSchema,
} from "@/db/schema/tables";
import { errorResponse, handleValidationError } from "./errors";
import { logActivity } from "./activity";

export async function listCustomers(req: Request) {
  const url = new URL(req.url);
  const search = url.searchParams.get("search");

  const rows = search
    ? await db
        .select()
        .from(customers)
        .where(
          or(
            ilike(customers.name, `%${search}%`),
            ilike(customers.email, `%${search}%`),
            ilike(customers.company, `%${search}%`),
          ),
        )
        .orderBy(desc(customers.createdAt))
    : await db
        .select()
        .from(customers)
        .orderBy(desc(customers.createdAt));

  return Response.json(rows);
}

export async function createCustomer(req: Request) {
  const parsed = insertCustomerSchema.safeParse(await req.json());
  if (!parsed.success) return handleValidationError(parsed.error.issues);

  const [row] = await db.insert(customers).values(parsed.data).returning();

  // server-after-nonblocking: activity log fires post-response.
  after(() =>
    logActivity({
      type: "customer_created",
      title: `New customer: ${row.name}`,
      description: row.company
        ? `${row.name} (${row.email}) was added from ${row.company}`
        : `${row.name} (${row.email}) was added`,
      relatedId: row.id,
    }),
  );

  return Response.json(row, { status: 201 });
}

export async function getCustomer(_req: Request, params: { id: string }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return errorResponse("bad_id", "id must be integer", 400);
  const [row] = await db.select().from(customers).where(eq(customers.id, id));
  if (!row) return errorResponse("not_found", "customer not found", 404);
  return Response.json(row);
}

export async function updateCustomer(req: Request, params: { id: string }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return errorResponse("bad_id", "id must be integer", 400);

  const parsed = updateCustomerSchema.safeParse(await req.json());
  if (!parsed.success) return handleValidationError(parsed.error.issues);

  const [row] = await db
    .update(customers)
    .set(parsed.data)
    .where(eq(customers.id, id))
    .returning();

  if (!row) return errorResponse("not_found", "customer not found", 404);
  return Response.json(row);
}

export async function deleteCustomer(_req: Request, params: { id: string }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return errorResponse("bad_id", "id must be integer", 400);
  await db.delete(customers).where(eq(customers.id, id));
  return new Response(null, { status: 204 });
}
