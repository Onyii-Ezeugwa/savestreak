import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function GET() {
  try {
    const user = await requireUserRecord();
    const { consent } = await getServices();
    return jsonOk(await consent.status(user));
  } catch (error) {
    return jsonError(error);
  }
}
