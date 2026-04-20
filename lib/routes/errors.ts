import "server-only";
import type { ZodIssue, ZodType } from "zod";

export function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export function handleValidationError(issues: ZodIssue[]) {
  return errorResponse(
    "validation_error",
    issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
    400,
  );
}

/**
 * Read and validate a JSON request body in one call. Returns either the
 * validated body (`ok: true`) or a ready-to-return 400 response
 * (`ok: false`). Never throws on bad JSON, empty body, or missing
 * Content-Type — those are user mistakes, not server bugs, and deserve
 * a structured 400 instead of an unhandled 500.
 *
 * Usage:
 *
 *   const body = await validateJsonBody(req, insertCustomerSchema);
 *   if (!body.ok) return body.response;
 *   const [row] = await db.insert(customers).values(body.data).returning();
 */
export async function validateJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid JSON";
    return {
      ok: false,
      response: errorResponse(
        "bad_json",
        `Request body must be valid JSON with Content-Type: application/json (${message})`,
        400,
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: handleValidationError(parsed.error.issues) };
  }
  return { ok: true, data: parsed.data };
}
