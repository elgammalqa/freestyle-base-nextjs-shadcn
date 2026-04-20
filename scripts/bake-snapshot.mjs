/**
 * Bake a Vercel Sandbox snapshot of this template and smoke-test it.
 *
 * Steps:
 *   1. Create a fresh sandbox
 *   2. Clone this repo into the workspace
 *   3. Run `npm install` (triggers postinstall: codegen)
 *   4. Start `next dev`, wait for /api/healthz
 *   5. Hit /api/buildra/selftest, verify structural checks pass
 *   6. Snapshot the sandbox
 *   7. Emit the snapshotId on stdout
 *
 * Required env:
 *   VERCEL_SANDBOX_PROJECT_ID, VERCEL_TOKEN, VERCEL_TEAM_ID
 *
 * Optional:
 *   TEMPLATE_REF — git ref to clone (default: main)
 *   DRY_RUN=1   — skip the snapshot step
 *
 * Exit codes:
 *   0 — snapshot created and smoke passed; snapshotId on stdout
 *   1 — any failure; diagnostics on stderr
 */
import { Sandbox } from "@vercel/sandbox";

const TEMPLATE_REPO =
  process.env.TEMPLATE_REPO ??
  "https://github.com/elgammalqa/freestyle-base-nextjs-shadcn";
const TEMPLATE_REF = process.env.TEMPLATE_REF ?? "main";
const WORKDIR = "/vercel/sandbox/workspace";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DRY_RUN = process.env.DRY_RUN === "1";

function getCreds() {
  const projectId = process.env.VERCEL_SANDBOX_PROJECT_ID?.trim();
  const token = process.env.VERCEL_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!projectId || !token || !teamId) {
    throw new Error(
      "Missing creds — set VERCEL_SANDBOX_PROJECT_ID, VERCEL_TOKEN, VERCEL_TEAM_ID",
    );
  }
  return { projectId, token, teamId };
}

async function runInSandbox(sandbox, command, timeoutMs = 120_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await sandbox.runCommand({
      cmd: "bash",
      args: ["-c", command],
      cwd: WORKDIR,
      signal: controller.signal,
    });
    const stdout = await result.stdout();
    const stderr = await result.stderr();
    return {
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout,
      stderr,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const creds = getCreds();
  console.error(`[bake] cloning ${TEMPLATE_REPO}@${TEMPLATE_REF}`);

  const sandbox = await Sandbox.create({
    ...creds,
    runtime: "node24",
    resources: { vcpus: 1 },
    // 15 minutes is enough for clone + install + build + snapshot
    timeout: 15 * 60 * 1000,
    ports: [3000],
  });

  try {
    const clone = await sandbox.runCommand("bash", [
      "-c",
      `git clone --depth 1 --branch ${TEMPLATE_REF} ${TEMPLATE_REPO} ${WORKDIR}`,
    ]);
    if (clone.exitCode !== 0) {
      throw new Error(`git clone failed: exit ${clone.exitCode}`);
    }

    console.error("[bake] npm install (runs postinstall codegen)");
    const install = await runInSandbox(sandbox, "npm install 2>&1 | tail -40", 300_000);
    if (!install.ok) {
      console.error(install.stdout);
      throw new Error(`npm install failed: exit ${install.exitCode}`);
    }

    console.error("[bake] verifying codegen output + schema contract");
    const verify = await runInSandbox(
      sandbox,
      "ls lib/api-client/generated/api.ts lib/api-zod/generated/zod.ts db/schema/tables.ts && grep -q 'export \\*' db/schema/tables.ts && echo OK",
      30_000,
    );
    if (!verify.ok || !verify.stdout.includes("OK")) {
      console.error(verify.stdout);
      console.error(verify.stderr);
      throw new Error("template structure invalid — codegen or tables.ts missing");
    }

    console.error("[bake] starting dev server in background");
    // Use a dummy DATABASE_URL so lib/db.ts doesn't crash at import
    await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        `DATABASE_URL='postgresql://bake:bake@localhost:5432/bake' nohup npm run dev > /tmp/dev.log 2>&1 &`,
      ],
      cwd: WORKDIR,
      detached: true,
    });

    console.error("[bake] waiting for /api/healthz to respond");
    let healthOk = false;
    for (let i = 0; i < 45; i++) {
      // Drop the -f flag because the post-hardening healthz returns 503
      // when the DB ping fails. During bake there is no real DATABASE_URL
      // wired (we use a dummy), so 503 is the steady state. What we
      // actually care about is that the route handler RUNS — proving
      // env validation, neon client init, middleware, and providers all
      // loaded cleanly. A 200 still passes if a real DB happens to be
      // reachable; either way, "responded" means the server is up.
      const probe = await runInSandbox(
        sandbox,
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/healthz",
        10_000,
      );
      const code = parseInt(probe.stdout.trim(), 10);
      if (code === 200 || code === 503) {
        healthOk = true;
        console.error(
          `[bake] healthz responded ${code} after ${i * 2}s` +
            (code === 503 ? " (degraded — no real DB in bake, expected)" : ""),
        );
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!healthOk) {
      const logs = await runInSandbox(sandbox, "tail -n 100 /tmp/dev.log", 10_000);
      console.error("[bake] healthz never responded — dev server log:");
      console.error(logs.stdout);
      throw new Error("dev server never became healthy");
    }

    console.error("[bake] checking /api/buildra/selftest structural checks");
    const selftest = await runInSandbox(
      sandbox,
      "curl -sS http://localhost:3000/api/buildra/selftest",
      30_000,
    );
    const payload = (() => {
      try {
        return JSON.parse(selftest.stdout);
      } catch {
        return null;
      }
    })();
    if (!payload || !Array.isArray(payload.checks)) {
      console.error("[bake] selftest raw response:", selftest.stdout.slice(0, 500));
      throw new Error("selftest did not return JSON with checks array");
    }
    const required = [
      "lib/api-client/generated loadable",
      "lib/api-zod/generated loadable",
      "db/schema/tables exports intact",
    ];
    const failed = payload.checks.filter(
      (c) => required.includes(c.name) && !c.ok,
    );
    if (failed.length > 0) {
      console.error("[bake] structural selftest checks failed:");
      for (const c of failed) {
        console.error(`  - ${c.name}: ${c.detail ?? "(no detail)"}`);
      }
      throw new Error("selftest structural checks failed");
    }
    console.error("[bake] selftest structural checks all green");

    if (DRY_RUN) {
      console.error("[bake] DRY_RUN=1 set — skipping snapshot step");
      await sandbox.stop().catch(() => {});
      process.stdout.write("dry-run-skipped\n");
      return;
    }

    console.error("[bake] creating snapshot");
    const snapshot = await sandbox.snapshot({ expiration: SEVEN_DAYS_MS });
    console.error(`[bake] snapshot id: ${snapshot.snapshotId}`);

    // Emit ONLY the snapshot id on stdout so CI can capture it cleanly
    process.stdout.write(`${snapshot.snapshotId}\n`);
  } catch (err) {
    console.error("[bake] failed:", err instanceof Error ? err.message : err);
    await sandbox.stop().catch(() => {});
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
