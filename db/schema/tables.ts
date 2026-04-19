// Aggregate re-export for every table module in db/schema/. Uses `export *`
// so that forgetting to re-export a new symbol from an entity file is
// impossible — every new file in this directory is automatically covered
// as long as it is `export *`-ed here.
//
// Why wildcard, not named re-exports: the LLM agent that edits this file to
// add an entity previously dropped existing lines on whole-file rewrites,
// surfacing in production as "Export insertCustomerSchema doesn't exist in
// target module" the moment a client form tried to import the validator.
// Wildcard removes that regression path. Client-bundle tree-shaking still
// works because all exports are ESM named, and the server-only transitivity
// is enforced by `lib/db.ts` marking itself `server-only` at the import edge.
//
// When you add a new entity module (e.g. `db/schema/tasks.ts`), add one line:
//   export * from "./tasks";
// That is the whole change.

export * from "./customers";
export * from "./deals";
