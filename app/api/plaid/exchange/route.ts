import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function POST(request: Request) {
  try {
    const user = await requireUserRecord();
    const body = await request.json();
    const { banks } = await getServices();
    return jsonOk(await banks.exchangePublicToken(user, body.public_token), 201);
  } catch (error) {
    return jsonError(error);
  }
}
