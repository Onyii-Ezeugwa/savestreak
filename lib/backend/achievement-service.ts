import { BADGES, howToEarn } from "@/lib/badges";
import { formatDateInputValue, startOfToday } from "@/lib/dates";
import { evaluateBadges } from "./badge-service";
import { closeFinishedChallenges } from "./challenge-service";
import { challengeById } from "./challenge-library";
import { addIsoDays } from "./habits";
import { requireActiveAccount } from "./goals-service";
import { readStreak } from "./streak-service";
import type { DataStore } from "./store";
import type { UserRecord } from "./types";

export async function readAchievements(store: DataStore, user: UserRecord) {
  requireActiveAccount(user);
  const today = formatDateInputValue(startOfToday());
  const streak = await readStreak(store, user.id);
  const earned = await evaluateBadges(store, user.id);
  await closeFinishedChallenges(store, user.id, today);
  const rows = await store.listChallengeParticipations(user.id);
  const earnedIds = new Set(earned.badges.map((badge) => badge.id));
  const challenges = rows
    .filter((item) => item.status === "completed")
    .sort(
      (a, b) =>
        b.weekStart.localeCompare(a.weekStart) ||
        a.challengeId.localeCompare(b.challengeId),
    )
    .map((item) => {
      const challenge = challengeById(item.challengeId);
      return {
        id: item.id,
        title: challenge?.title ?? "Completed challenge",
        weekStart: item.weekStart,
        weekEnd: addIsoDays(item.weekStart, 6),
        result: "Completed",
        progress: item.progressCents / 100,
        target: (challenge?.targetCents ?? 0) / 100,
      };
    });

  return {
    streak,
    badges: earned.badges,
    locked: BADGES.filter((badge) => !earnedIds.has(badge.id)).map((badge) => ({
      id: badge.id,
      name: badge.name,
      howToEarn: howToEarn(badge.id),
    })),
    challenges,
    totals: {
      badgesEarned: earned.badges.length,
      badgesAvailable: BADGES.length,
      challengesCompleted: challenges.length,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    },
  };
}
