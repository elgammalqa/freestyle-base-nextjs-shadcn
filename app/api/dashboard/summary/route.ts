import { getDashboardSummary } from "@/lib/routes/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  return getDashboardSummary();
}
