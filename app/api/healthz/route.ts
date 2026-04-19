import { healthCheck } from "@/lib/routes/health";

export const dynamic = "force-dynamic";

export async function GET() {
  return healthCheck();
}
