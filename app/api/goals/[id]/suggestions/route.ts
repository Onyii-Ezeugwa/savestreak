import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { ApiError } from "@/lib/backend/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireUserRecord();
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      suggestionId?: string;
      refresh?: boolean;
    };
    const { goals } = await getServices();
    if (body.action === "accept" || body.action === "dismiss") {
      if (!body.suggestionId) {
        throw new ApiError(400, "Choose a suggestion.");
      }
      return jsonOk(
        body.action === "accept"
          ? await goals.acceptSuggestion(user, id, body.suggestionId)
          : await goals.dismissSuggestion(user, id, body.suggestionId),
      );
    }
    return jsonOk(await goals.suggestions(user, id, body.refresh === true));
  } catch (error) {
    return jsonError(error);
  }
}
