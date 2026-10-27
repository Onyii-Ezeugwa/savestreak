import { BADGES, STREAK_BADGES, badgeById } from "@/lib/badges";
import { goalIsComplete, goalProgressPercent } from "@/lib/goal-progress";
import type { DataStore } from "./store";

export async function evaluateBadges(store: DataStore, userId: string) {
  const [goals, accounts, reads, streak, existing] = await Promise.all([
    store.listGoals(userId),
    store.listBankAccounts(userId),
    store.listLessonReads(userId),
    store.getSavingsStreak(userId),
    store.listUserBadges(userId),
  ]);
  const earned = new Set(existing.map((badge) => badge.badgeId));
  const wanted: string[] = [];

  if (goals.length > 0) {
    wanted.push("first-goal");
  }

  for (const goal of goals) {
    const linked = goal.linkedAccountId
      ? accounts.find((account) => account.id === goal.linkedAccountId)
      : null;
    const saved =
      linked != null ? Math.max(0, linked.balanceCents) : goal.currentAmountCents;
    if (goalProgressPercent(saved, goal.targetAmountCents) >= 50) {
      wanted.push("halfway");
    }
    if (goalIsComplete(saved, goal.targetAmountCents)) {
      wanted.push("goal-complete");
    }
  }

  const reached = Math.max(streak?.currentStreak ?? 0, streak?.longestStreak ?? 0);
  for (const medal of STREAK_BADGES) {
    if (reached >= medal.weeks) {
      wanted.push(medal.id);
    }
  }
  if (reads.length > 0) {
    wanted.push("first-lesson");
  }

  const justEarned = [];
  for (const badgeId of [...new Set(wanted)]) {
    if (earned.has(badgeId) || !badgeById(badgeId)) {
      continue;
    }
    const record = {
      userId,
      badgeId,
      earnedAt: new Date().toISOString(),
    };
    const inserted = await store.awardBadge(record);
    if (inserted) {
      justEarned.push(record);
    }
  }

  const badges = await store.listUserBadges(userId);
  return {
    badges: badges
      .map((badge) => {
        const definition = badgeById(badge.badgeId);
        if (!definition) {
          return null;
        }
        return {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          earnedAt: badge.earnedAt,
        };
      })
      .filter((badge) => badge !== null),
    justEarned: justEarned.map((badge) => {
      const definition = BADGES.find((item) => item.id === badge.badgeId)!;
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        earnedAt: badge.earnedAt,
      };
    }),
  };
}
