# Codegen Workflow

This template has an OpenAPI + Drizzle codegen pipeline. The LLM edits TWO
source-of-truth files and runs ONE command. Typed React Query hooks, Zod
validators, and API types are generated automatically.

**Do NOT** hand-write `fetch()` calls, Zod validators, or API types.
**Do NOT** put files under `src/`.

## Adding an entity in 5 steps

Say you want a `tasks` entity.

### 1. Edit `db/schema/tasks.ts`

```ts
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const updateTaskSchema = createUpdateSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });

export type Task = typeof tasks.$inferSelect;
```

### 2. Re-export from `db/schema/tables.ts`

```ts
export { tasks, insertTaskSchema, updateTaskSchema } from "./tasks";
export type { Task } from "./tasks";
```

### 3. Add endpoints to `openapi.yaml`

`/tasks` GET + POST, `/tasks/{id}` GET + PATCH + DELETE. Define `Task`,
`CreateTaskBody`, `UpdateTaskBody` schemas. Copy the shape from the
existing `customers` endpoints — it's deliberate that they look the same.

### 4. Run codegen

```bash
npm run codegen
```

This regenerates `lib/api-client/generated/api.ts` (React Query hooks) and
`lib/api-zod/generated/zod.ts` (request/response validators).

### 5. Write the route handler + dispatcher

`lib/routes/tasks.ts` — business logic, uses `db`, `insertTaskSchema`,
`after()` for activity logs.

```ts
import "server-only";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, insertTaskSchema } from "@/db/schema/tables";
import { errorResponse, handleValidationError } from "./errors";

export async function createTask(req: Request) {
  const parsed = insertTaskSchema.safeParse(await req.json());
  if (!parsed.success) return handleValidationError(parsed.error.issues);
  const [row] = await db.insert(tasks).values(parsed.data).returning();
  return Response.json(row, { status: 201 });
}
```

`app/api/tasks/route.ts` — 5-line dispatcher:

```ts
import { listTasks, createTask } from "@/lib/routes/tasks";
export const dynamic = "force-dynamic";
export async function GET(req: Request) { return listTasks(req); }
export async function POST(req: Request) { return createTask(req); }
```

`app/api/tasks/[id]/route.ts` — mirror `customers/[id]/route.ts`.

### 6. Push the schema

```bash
npm run db:push
```

## Adding a page that reads data

Prefer Server Components with `prefetchQuery` + `<HydrationBoundary>`.
This gives first-paint data, no loading flash.

```tsx
// app/tasks/page.tsx
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { listTasks, getListTasksQueryKey } from "@/lib/api-client/generated/api";
import { TasksView } from "@/components/tasks/tasks-view";

export default async function TasksPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery({ queryKey: getListTasksQueryKey(), queryFn: () => listTasks() });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <TasksView />
    </HydrationBoundary>
  );
}
```

```tsx
// components/tasks/tasks-view.tsx
"use client";
import { useListTasks } from "@/lib/api-client/generated/api";
// ...
```

## The server / client boundary — HARD RULE

| Path | Safe to import from |
|---|---|
| `@/lib/db` + `@/db/schema/*` | Server only (server components, route handlers, server actions). Build fails otherwise because of `server-only`. |
| `@/lib/api-zod/generated/*` | Anywhere |
| `@/lib/api-client/generated/*` — the hooks (`useXxx`) | Client components only |
| `@/lib/api-client/generated/*` — the non-hook fns (`listXxx`, `getXxx`) | Anywhere, including RSC prefetch |

NEVER do `import { db } from "@/lib/db"` in a file with `"use client"`.
NEVER do `import { customers } from "@/db/schema/tables"` in a client component.

## Parallel fetches

Multiple independent queries in one place → **always `Promise.all`**.

```ts
// Route handler — parallel DB reads
const [a, b, c] = await Promise.all([queryA(), queryB(), queryC()]);

// RSC — parallel prefetches
await Promise.all([qc.prefetchQuery(qA), qc.prefetchQuery(qB)]);

// Activity logs — post-response via after()
after(() => db.insert(activity).values({...}));
```

Never write sequential awaits for independent operations.

## Conditional rendering in JSX

Use ternary, not `&&`. `&&` on a numeric 0 leaks "0" to the DOM.

```tsx
// WRONG:
{items.length && <List items={items} />}

// RIGHT:
{items.length > 0 ? <List items={items} /> : <EmptyState />}
```

## Heavy libraries

`recharts`, `framer-motion` scroll reveals, large icon sets, any library over
~30KB → dynamic import with `ssr: false` + `loading` fallback.

```tsx
const Chart = dynamic(() => import("./chart").then(m => m.Chart), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});
```

## When typecheck fails

1. Run `npm run codegen` first — generated types may be stale after a
   schema or openapi edit.
2. Read the error. If it says "Property X does not exist" on a generated
   type, check `openapi.yaml` — the property is probably not declared.
3. NEVER paper over with `any`. NEVER add `@ts-expect-error` to silence
   a legit type mismatch.

## Forbidden patterns

Each of these breaks the build or corrupts the data layer:

- Hand-written `fetch()` in client components → use generated hooks
- Hand-written Zod validators for API bodies → use generated ones
- `import { db } from "@/lib/db"` in a `"use client"` file → build fails
- Defining components inside other components → re-render thrash
- Creating a `src/` directory → `@/*` alias is rooted at repo root
- `@/components/ui` barrel import → no barrel exists
- Sequential `await`s for independent work → use `Promise.all`
- Activity logs in the response path → use `after()`
