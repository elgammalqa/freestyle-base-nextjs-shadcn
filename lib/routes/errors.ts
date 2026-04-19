import "server-only";
import type { ZodIssue } from "zod";

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
