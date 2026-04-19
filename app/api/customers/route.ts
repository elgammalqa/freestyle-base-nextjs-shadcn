import {
  listCustomers,
  createCustomer,
} from "@/lib/routes/customers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return listCustomers(req);
}

export async function POST(req: Request) {
  return createCustomer(req);
}
