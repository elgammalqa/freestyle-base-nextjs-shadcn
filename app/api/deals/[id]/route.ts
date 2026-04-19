import {
  getDeal,
  updateDeal,
  deleteDeal,
} from "@/lib/routes/deals";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  return getDeal(req, await params);
}

export async function PATCH(req: Request, { params }: Ctx) {
  return updateDeal(req, await params);
}

export async function DELETE(req: Request, { params }: Ctx) {
  return deleteDeal(req, await params);
}
