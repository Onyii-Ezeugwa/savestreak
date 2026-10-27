import { evaluateBadges } from "@/lib/backend/badge-service";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { requireActiveAccount } from "@/lib/backend/goals-service";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";
import { readStreak } from "@/lib/backend/streak-service";

export async function GET() {
  try {
    const user = await requireUserRecord();
    requireActiveAccount(user);
    const { store, goals, banks } = await getServices();
    const streakPromise = readStreak(store, user.id);
    const [goalList, bankList, streak, badges] = await Promise.all([
      goals.list(user),
      banks.list(user),
      streakPromise,
      streakPromise.then(() => evaluateBadges(store, user.id)),
    ]);
    return jsonOk({
      goals: goalList,
      connections: bankList.connections,
      netWorth: bankList.netWorth,
      streak,
      badges,
    });
  } catch (error) {
    return jsonError(error);
  }
}
