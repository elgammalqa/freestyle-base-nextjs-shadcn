/**
 * Unit tests for validateJsonBody — the single source of truth for
 * "did the user send valid JSON in the request body?". This helper
 * exists to eliminate the entire class of "Unexpected end of JSON input"
 * 500s that come from unguarded `await req.json()` in route handlers.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateJsonBody } from "@/lib/routes/errors";

const Schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("validateJsonBody", () => {
  it("returns ok:true with parsed data on valid body", async () => {
    const result = await validateJsonBody(
      jsonRequest({ name: "Alice", email: "alice@test.local" }),
      Schema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ name: "Alice", email: "alice@test.local" });
    }
  });

  it("returns ok:false with 400 on empty body", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const result = await validateJsonBody(req, Schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe("bad_json");
    }
  });

  it("returns ok:false with 400 on malformed JSON", async () => {
    const result = await validateJsonBody(jsonRequest("{not json"), Schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("returns ok:false with 400 on schema mismatch", async () => {
    const result = await validateJsonBody(
      jsonRequest({ name: "", email: "not-an-email" }),
      Schema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe("validation_error");
    }
  });

  it("returns ok:false with 400 on missing field", async () => {
    const result = await validateJsonBody(
      jsonRequest({ name: "Alice" }),
      Schema,
    );
    expect(result.ok).toBe(false);
  });
});
