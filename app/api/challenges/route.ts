import { jsonError, jsonOk } from "@/lib/backend/http";
import { closeFinishedChallenges, joinChallenge, listChallenges } from "@/lib/backend/challenge-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { ApiError } from "@/lib/backend/types";

export async function GET(request: Request) {
  try {
    const user = await requireUserRecord();
    const today = new URL(request.url).searchParams.get("today") ?? undefined;
    const { store } = await getServices();
    return jsonOk(await listChallenges(store, user, today));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserRecord();
    const body = (await request.json().catch(() => ({}))) as {
      challengeId?: string;
      today?: string;
      action?: string;
    };
    const { store } = await getServices();
    if (body.action === "close") {
      const today = body.today;
      const closed = await closeFinishedChallenges(
        store,
        user.id,
        today && /^\d{4}-\d{2}-\d{2}$/.test(today)
          ? today
          : new Date().toISOString().slice(0, 10),
      );
      return jsonOk({ closed });
    }
    if (!body.challengeId) {
      throw new ApiError(400, "Choose a challenge.");
    }
    return jsonOk(await joinChallenge(store, user, body.challengeId, body.today), 201);
  } catch (error) {
    return jsonError(error);
  }
}
