import { jsonError, jsonOk } from "@/lib/backend/http";
import { requireActiveAccount } from "@/lib/backend/goals-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { readStreak } from "@/lib/backend/streak-service";

export async function GET() {
  try {
    const user = await requireUserRecord();
    requireActiveAccount(user);
    const { store } = await getServices();
    return jsonOk(await readStreak(store, user.id));
  } catch (error) {
    return jsonError(error);
  }
}
