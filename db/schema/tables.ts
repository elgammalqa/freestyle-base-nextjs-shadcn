// Named re-exports only. Do NOT add a default export and do NOT add a
// wildcard `export *` — keeping imports explicit helps Next.js tree-shake
// client bundles and discourages accidental DB-in-client imports.
//
// Server-only by transitivity: everything here depends on drizzle-orm +
// pg types that are large and server-only. Use `"server-only"` in any
// file that imports from here (lib/db.ts does this already).

export { customers, insertCustomerSchema, updateCustomerSchema } from "./customers";
export type { Customer, InsertCustomer } from "./customers";

export {
  deals,
  insertDealSchema,
  updateDealSchema,
  DEAL_STAGES,
} from "./deals";
export type { Deal, InsertDeal, DealStage } from "./deals";
