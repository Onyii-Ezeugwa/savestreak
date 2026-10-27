import { evaluateBadges } from "@/lib/backend/badge-service";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { requireActiveAccount } from "@/lib/backend/goals-service";
import { readLesson } from "@/lib/backend/lesson-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserRecord();
    requireActiveAccount(user);
    const { id } = await context.params;
    const { store } = await getServices();
    const result = await readLesson(store, user.id, id);
    const badges = await evaluateBadges(store, user.id);
    return jsonOk({ ...result, justEarned: badges.justEarned });
  } catch (error) {
    return jsonError(error);
  }
}
