import { evaluateBadges } from "@/lib/backend/badge-service";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { requireActiveAccount } from "@/lib/backend/goals-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function GET() {
  try {
    const user = await requireUserRecord();
    requireActiveAccount(user);
    const { store } = await getServices();
    return jsonOk(await evaluateBadges(store, user.id));
  } catch (error) {
    return jsonError(error);
  }
}
