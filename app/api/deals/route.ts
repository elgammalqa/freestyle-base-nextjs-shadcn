import { listDeals, createDeal } from "@/lib/routes/deals";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return listDeals(req);
}

export async function POST(req: Request) {
  return createDeal(req);
}
