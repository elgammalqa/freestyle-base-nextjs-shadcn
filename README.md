# freestyle-base-nextjs-shadcn

Fullstack starter template Buildra's sandbox clones on every "build me a…" prompt that resolves to `appType: fullstack`. Next.js 15 (App Router, Turbopack dev) + shadcn/ui + Tailwind v4 + Drizzle + Neon HTTP + Orval OpenAPI codegen + TanStack Query + drizzle-zod validators.

## Developer setup

```bash
npm install   # postinstall runs `npm run codegen` to hydrate generated dirs
cp .env.example .env.local   # set DATABASE_URL + DATABASE_URL_UNPOOLED
npm run db:push               # creates customers + deals tables on Neon
npm run dev                    # predev re-runs codegen, then starts next dev
```

Hit `http://localhost:3000/api/buildra/selftest` to see which gates pass.

## CI

`.github/workflows/ci.yml` runs on every PR + push to main:

1. `npm ci` — proves postinstall codegen is working
2. `npm run typecheck`
3. `npm run build` — `next.config.ts` no longer ignores TS/lint errors, so a bad re-export in `db/schema/tables.ts` or a broken hook import fails the build
4. Dev server smoke — boots `npm run dev`, waits for `/api/healthz`, then checks `/api/buildra/selftest` structural gates (codegen loadable + schema exports intact)

DB checks fail in CI because there is no real Neon — that is expected and ignored. The point is the structural gates.

## Ops — sandbox snapshot rotation

`.github/workflows/rotate-snapshot.yml` bakes a Vercel Sandbox snapshot from `main` and rotates `SANDBOX_SNAPSHOT_FULLSTACK` on the main Buildra Vercel project. Trigger it from the Actions tab after merging a template PR.

The workflow:

1. Clones this repo into a fresh sandbox
2. Runs `npm install` (triggers postinstall codegen)
3. Boots `npm run dev` and verifies `/api/healthz` + structural selftest gates
4. Snapshots the sandbox
5. Upserts `SANDBOX_SNAPSHOT_FULLSTACK` on the Buildra project for production + preview
6. Triggers a Buildra redeploy so the new env var takes effect

If any gate fails, the snapshot is not created and the env var stays pointed at the last known-good snapshot.

### Required GitHub Actions secrets

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Vercel access token with write access to both the sandbox project and the main Buildra project |
| `VERCEL_TEAM_ID` | Vercel team id |
| `VERCEL_SANDBOX_PROJECT_ID` | Vercel project id where template snapshots are baked |
| `BUILDRA_PROJECT_ID` | Main Buildra Vercel project id (the one whose `SANDBOX_SNAPSHOT_FULLSTACK` env gets rotated) |

Set these once in `Settings → Secrets and variables → Actions`.

### Manual rotation from a laptop

If CI is unavailable, `scripts/bake-snapshot.mjs` is self-contained. Pull Vercel creds via `vercel env pull .env.bake --environment=production` from the main Buildra project, then:

```bash
set -a && source .env.bake && set +a
node scripts/bake-snapshot.mjs
# emits snapshot id on stdout once smoke passes
```

Then upsert the snapshot id with `.github/scripts/vercel-upsert-env.sh` or the `vercel env add` CLI.

## Hard rules (enforced in CI + by `README_AI.md`)

- `db/schema/tables.ts` uses `export *` — forgetting to re-export a symbol from an entity file is impossible
- `next.config.ts` does **not** set `ignoreBuildErrors` or `ignoreDuringBuilds` — TS/lint errors fail the build
- `postinstall`, `predev`, and `prebuild` all run `npm run codegen` — the gitignored `lib/api-client/generated` and `lib/api-zod/generated` dirs are guaranteed fresh before any dev or build run
- `lib/db.ts` reads `DATABASE_URL` at module load and marks itself `"server-only"` — never import it from a client component

## See also

- `README_AI.md` — what the LLM agent is instructed to do inside this template
- `lib/codegen.md` — full codegen workflow walkthrough
- `app/api/buildra/selftest/route.ts` — the in-template diagnostic endpoint
