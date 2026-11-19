import { readAchievements } from "@/lib/backend/achievement-service";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function GET() {
  try {
    const user = await requireUserRecord();
    const { store } = await getServices();
    return jsonOk(await readAchievements(store, user));
  } catch (error) {
    return jsonError(error);
  }
}
