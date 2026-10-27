import { jsonError, jsonOk } from "@/lib/backend/http";
import { requireActiveAccount } from "@/lib/backend/goals-service";
import { setLessonSaved } from "@/lib/backend/lesson-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { ApiError } from "@/lib/backend/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserRecord();
    requireActiveAccount(user);
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { saved?: unknown } | null;
    if (typeof body?.saved !== "boolean") {
      throw new ApiError(400, "Choose whether to save this lesson.");
    }
    const { store } = await getServices();
    return jsonOk(await setLessonSaved(store, user.id, id, body.saved));
  } catch (error) {
    return jsonError(error);
  }
}
