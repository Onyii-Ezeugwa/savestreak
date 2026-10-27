import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import {
  generateWeeklySummary,
  listSummaries,
} from "@/lib/backend/summary-service";

export async function GET() {
  try {
    const user = await requireUserRecord();
    const { store } = await getServices();
    return jsonOk({ summaries: await listSummaries(store, user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserRecord();
    const body = (await request.json().catch(() => ({}))) as {
      weekStart?: string;
      today?: string;
      refresh?: boolean;
    };
    const { store } = await getServices();
    const summary = await generateWeeklySummary(store, user, body);
    return jsonOk({ summary }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
