/**
 * Tests for the schema state guard. Catches the two silent failure
 * modes that have hit generated apps the most: missing re-exported
 * file (every API 500s) and orphan schema file (forms break at runtime).
 */
import { afterEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(__dirname, "..", "scripts", "verify-schema-state.mjs");

function makeFixture(): {
  dir: string;
  writeSchema: (name: string, body?: string) => void;
  writeTables: (body: string) => void;
  cleanup: () => void;
  run: () => { exit: number; stdout: string; stderr: string };
} {
  const dir = mkdtempSync(join(tmpdir(), "schema-guard-"));
  mkdirSync(join(dir, "db", "schema"), { recursive: true });

  return {
    dir,
    writeSchema: (name: string, body = "// stub") => {
      writeFileSync(join(dir, "db", "schema", `${name}.ts`), body);
    },
    writeTables: (body: string) => {
      writeFileSync(join(dir, "db", "schema", "tables.ts"), body);
    },
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
    run: () => {
      try {
        const stdout = execSync(`node ${SCRIPT}`, {
          cwd: dir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        return { exit: 0, stdout, stderr: "" };
      } catch (err) {
        const e = err as { status: number; stdout?: string; stderr?: string };
        return { exit: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
      }
    },
  };
}

describe("verify-schema-state", () => {
  let fixture: ReturnType<typeof makeFixture>;
  afterEach(() => fixture?.cleanup());

  it("passes on a clean repo with matched re-exports", () => {
    fixture = makeFixture();
    fixture.writeSchema("customers");
    fixture.writeSchema("deals");
    fixture.writeTables('export * from "./customers";\nexport * from "./deals";\n');

    const result = fixture.run();
    expect(result.exit).toBe(0);
  });

  it("FAILS when tables.ts re-exports a missing file (the common agent bug)", () => {
    fixture = makeFixture();
    fixture.writeSchema("customers");
    fixture.writeTables('export * from "./customers";\nexport * from "./activity";\n');

    const result = fixture.run();
    expect(result.exit).toBe(1);
    expect(result.stderr).toContain("re-exports \"./activity\"");
    expect(result.stderr).toContain("does not exist");
    expect(result.stderr).toContain("Create db/schema/activity.ts");
  });

  it("FAILS when a schema file exists but is not re-exported (orphan)", () => {
    fixture = makeFixture();
    fixture.writeSchema("customers");
    fixture.writeSchema("orphan");
    fixture.writeTables('export * from "./customers";\n');

    const result = fixture.run();
    expect(result.exit).toBe(1);
    expect(result.stderr).toContain("orphan.ts exists but is NOT re-exported");
    expect(result.stderr).toContain('export * from "./orphan"');
  });

  it("ignores commented-out re-exports", () => {
    fixture = makeFixture();
    fixture.writeSchema("customers");
    fixture.writeTables(
      'export * from "./customers";\n' +
        '// export * from "./activity";\n' +
        '/* export * from "./drafts"; */\n',
    );

    const result = fixture.run();
    expect(result.exit).toBe(0);
  });

  it("reports both classes of error in one run", () => {
    fixture = makeFixture();
    fixture.writeSchema("customers");
    fixture.writeSchema("orphan");
    fixture.writeTables(
      'export * from "./customers";\nexport * from "./missing";\n',
    );

    const result = fixture.run();
    expect(result.exit).toBe(1);
    expect(result.stderr).toContain("missing");
    expect(result.stderr).toContain("orphan");
  });

  it("passes when no tables.ts exists yet (early scaffold state)", () => {
    fixture = makeFixture();
    rmSync(join(fixture.dir, "db", "schema"), { recursive: true, force: true });

    const result = fixture.run();
    expect(result.exit).toBe(0);
  });
});
