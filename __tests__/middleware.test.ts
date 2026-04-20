/**
 * Unit tests for the CSRF middleware. The agent ships state-changing
 * routes (POST /api/customers etc.) and we want to know that an attacker
 * page can't trigger writes via a victim's session cookie.
 */
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

function buildReq(method: string, headers: Record<string, string> = {}) {
  // NextRequest is a thin wrapper over Request — the middleware only
  // reads .method and .headers, so a vanilla Request works for tests.
  return new Request("http://localhost/api/customers", {
    method,
    headers,
  }) as unknown as Parameters<typeof middleware>[0];
}

describe("CSRF middleware", () => {
  it("allows GET requests with no Origin", () => {
    const res = middleware(buildReq("GET"));
    expect(res.status).toBe(200);
  });

  it("allows POST requests with no Origin (server-to-server)", () => {
    const res = middleware(buildReq("POST"));
    expect(res.status).toBe(200);
  });

  it("allows POST requests with same-origin", () => {
    const res = middleware(
      buildReq("POST", {
        origin: "http://localhost",
        host: "localhost",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("rejects POST requests with cross-origin Origin", () => {
    const res = middleware(
      buildReq("POST", {
        origin: "https://attacker.example.com",
        host: "localhost",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects PATCH requests with cross-origin Origin", () => {
    const res = middleware(
      buildReq("PATCH", {
        origin: "https://attacker.example.com",
        host: "localhost",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects DELETE requests with cross-origin Origin", () => {
    const res = middleware(
      buildReq("DELETE", {
        origin: "https://attacker.example.com",
        host: "localhost",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects requests with malformed Origin", () => {
    const res = middleware(
      buildReq("POST", {
        origin: "not-a-url",
        host: "localhost",
      }),
    );
    expect(res.status).toBe(403);
  });
});
