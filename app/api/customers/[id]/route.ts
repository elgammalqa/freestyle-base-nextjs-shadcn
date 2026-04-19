import {
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/routes/customers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  return getCustomer(req, await params);
}

export async function PATCH(req: Request, { params }: Ctx) {
  return updateCustomer(req, await params);
}

export async function DELETE(req: Request, { params }: Ctx) {
  return deleteCustomer(req, await params);
}
