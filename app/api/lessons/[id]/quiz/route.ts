import { jsonError, jsonOk } from "@/lib/backend/http";
import { readLessonQuiz, submitLessonQuiz } from "@/lib/backend/quiz-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireUserRecord();
    const { store } = await getServices();
    return jsonOk(await readLessonQuiz(store, user, id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireUserRecord();
    const body = (await request.json().catch(() => ({}))) as { answers?: unknown };
    const { store } = await getServices();
    return jsonOk(await submitLessonQuiz(store, user, id, body.answers));
  } catch (error) {
    return jsonError(error);
  }
}
