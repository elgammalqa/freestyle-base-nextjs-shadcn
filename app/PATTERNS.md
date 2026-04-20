# App Patterns

This template is opinionated. Follow these patterns when generating new
code — they're the difference between an app that ships and one that
fails QA on the second user.

## When you create a new page

Always create the trio in the same commit:

```
app/<route>/page.tsx       ← the page itself
app/<route>/loading.tsx    ← Skeleton or simple placeholder
app/<route>/error.tsx      ← "use client"; reset button
```

Pattern for `page.tsx`:

```tsx
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata("Customers", "Manage your CRM contacts");
export const revalidate = 30;  // ISR — never use force-dynamic on a page
                               // unless data is truly per-request
```

## When you create a new entity (e.g. invoices, tickets)

You must create exactly these files together. Skipping any one will fail
typecheck OR runtime smoke.

1. `db/schema/<name>.ts`
   - drizzle table + `insertXxxSchema` + `updateXxxSchema` + `Xxx` type
2. `db/schema/tables.ts`
   - re-export the table + `insertXxxSchema` + `updateXxxSchema`
3. `openapi.yaml`
   - paths for `/api/<name>`, `/api/<name>/{id}` with all four methods
   - request bodies + response schemas
4. `lib/routes/<name>.ts`
   - `list<Name>`, `create<Name>`, `get<Name>`, `update<Name>`, `delete<Name>`
   - import `validateJsonBody` for POST/PATCH (NEVER raw `req.json()`)
   - import `errorResponse` for not-found / bad-id / validation errors
5. `app/api/<name>/route.ts` + `app/api/<name>/[id]/route.ts`
   - thin dispatchers that call the route handlers
   - call `revalidatePath()` at the end of mutations

Then run `npm run codegen` to regenerate React Query hooks + Zod
validators. Without this step, `useList<Name>()` won't exist on the client.

## When you create a form

Forms use `insertXxxSchema` / `updateXxxSchema` from
`@/db/schema/tables` (drizzle-zod), NOT from
`@/lib/api-zod/generated` (orval's OpenAPI types).

```tsx
import { insertCustomerSchema } from "@/db/schema/tables";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({
  resolver: zodResolver(insertCustomerSchema),
});
```

## When you make a mutation

Always:
1. Use the orval-generated `useCreateXxx` / `useUpdateXxx` hook
2. The hook handles `cache: "no-store"` automatically (see custom-fetch.ts)
3. In `onSuccess`, invalidate the read query: `queryClient.invalidateQueries({ queryKey: getListXxxQueryKey() })`
4. The route handler should call `revalidatePath("/dashboard")` to bust the
   server-side Full Route Cache too

## When you add an icon

Import named:

```tsx
import { Users, Settings } from "lucide-react";
```

`next.config.ts` has `optimizePackageImports: ["lucide-react"]` so this
tree-shakes correctly. Do NOT use `import * as Icons from "lucide-react"`.

## When you ship

Never call `commitTool` directly. Always use `shipTool`, which runs:
1. `typecheckTool` — TS must compile
2. `apiSmokeTool` — POST/PATCH/DELETE per mutable entity must return 2xx
3. `commitTool` — only if both gates pass

`shipTool.endpoints` must include the full lifecycle for every entity
the user can create/edit. GET-only is rejected.

## Things that are gone (and shouldn't come back)

- `cache: "no-store"` hardcoded in customFetch — removed v2. React Query
  + Next.js Data Cache handle freshness now.
- `dynamic = "force-dynamic"` on the dashboard page — replaced with
  `revalidate = 30`. Use the same pattern for any data-driven page.
- Stub `/api/healthz` — it now pings the DB. If you copy this pattern
  for a `/api/readyz`, do the same.

## Required files in app/ (don't delete)

- `app/loading.tsx` — instant skeleton on every navigation
- `app/error.tsx` — segment-level error boundary
- `app/not-found.tsx` — 404 page
- `app/global-error.tsx` — last-resort error boundary
- `middleware.ts` — origin-based CSRF check on /api/* mutations
- `lib/env.ts` — fails boot on missing env, imported by lib/db.ts
- `lib/auth.ts` — auth seam (stub today; real provider tomorrow)
