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
    const { goals } = await getServices();
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      plan?: Record<string, unknown>;
    };

    if (body.action === "save") {
      if (!body.plan) {
        throw new ApiError(400, "Provide a savings plan to save.");
      }
      const goal = await goals.savePlan(user, id, body.plan);
      return jsonOk({ goal });
    }

    const plan = await goals.createPlan(user, id);
    return jsonOk({ plan });
  } catch (error) {
    return jsonError(error);
  }
}
