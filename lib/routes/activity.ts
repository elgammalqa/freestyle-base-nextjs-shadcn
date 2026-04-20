import "server-only";

/**
 * Placeholder activity logger. Replace with a real DB-backed activity
 * table when the app grows one. Kept as a stub so route handlers can
 * call `after(() => logActivity(...))` consistently today without
 * blocking shipment on a second table.
 */
export function logActivity(payload: {
  type: string;
  title: string;
  description: string;
  relatedId: number;
}) {
  console.info("[activity]", payload);
}
