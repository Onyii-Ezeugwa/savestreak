import { jsonError, jsonOk } from "@/lib/backend/http";
import { requireActiveAccount } from "@/lib/backend/goals-service";
import { recommendLessons } from "@/lib/backend/lesson-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export const maxDuration = 60;

export async function GET() {
  try {
    const user = await requireUserRecord();
    requireActiveAccount(user);
    const { store } = await getServices();
    return jsonOk(await recommendLessons(store, user.id));
  } catch (error) {
    return jsonError(error);
  }
}
