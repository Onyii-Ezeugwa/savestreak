import { jsonError, jsonOk } from "@/lib/backend/http";
import { financialOverview } from "@/lib/backend/overview-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function GET() {
  try {
    const user = await requireUserRecord();
    const { store } = await getServices();
    return jsonOk(await financialOverview(store, user));
  } catch (error) {
    return jsonError(error);
  }
}
