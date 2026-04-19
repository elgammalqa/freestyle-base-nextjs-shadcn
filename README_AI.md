# AI Development Rules

This template has a codegen pipeline. To add/change API endpoints, edit
**two** source-of-truth files and run **one** command:

1. `db/schema/<entity>.ts` — Drizzle table definition
2. `openapi.yaml` — API contract
3. `npm run codegen` — regenerates React Query hooks + Zod validators

**Full workflow: see `lib/codegen.md`.** Read it before making changes.

## Hard rules

- **Do NOT** hand-write `fetch()` calls. Use the generated hooks from
  `@/lib/api-client/generated/api`.
- **Do NOT** hand-write Zod validators for API bodies. They come from
  `@/lib/api-zod/generated/zod`.
- **Do NOT** put files in `src/`. This template is non-`src` — the `@/*`
  alias points at the repo root.
- **Do NOT** import `@/lib/db` or `@/db/schema/*` from a file with
  `"use client"`. Build fails at compile time via `server-only`.
- **Do NOT** import from `@/components/ui` (no barrel exists). Import
  from individual files: `@/components/ui/button`.

## Components

`components/ui/` — 50+ shadcn components, pre-installed. Use them instead
of raw HTML.

`components/layout/app-shell.tsx` — responsive sidebar + mobile Sheet. Edit
`components/layout/nav-items.tsx` to change navigation links.

## Verify before committing

```bash
npm run codegen     # regenerate if you changed openapi.yaml or db/schema
npm run typecheck   # must pass
npm run db:push     # if db/schema changed
```
