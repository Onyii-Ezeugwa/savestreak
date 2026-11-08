import { randomUUID } from "node:crypto";
import { evaluateSavingsStreak } from "./habits";
import type { DataStore } from "./store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordSavingsSnapshot(
  store: DataStore,
  userId: string,
  input: {
    savingsCents: number;
    assetsCents?: number | null;
    debtsCents?: number | null;
    netWorthCents?: number | null;
  },
) {
  await store.addBalanceSnapshot({
    id: randomUUID(),
    userId,
    capturedAt: new Date().toISOString(),
    savingsCents: input.savingsCents,
    assetsCents: input.assetsCents ?? null,
    debtsCents: input.debtsCents ?? null,
    netWorthCents: input.netWorthCents ?? null,
  });
  return recomputeStreak(store, userId);
}

function toPublicStreak(
  evaluation: ReturnType<typeof evaluateSavingsStreak>,
) {
  return {
    currentStreak: evaluation.currentStreak,
    longestStreak: evaluation.longestStreak,
    history: evaluation.history.map((week) => ({
      weekStart: week.weekStart,
      increased: week.increased,
      start: week.startCents / 100,
      end: week.endCents / 100,
    })),
  };
}

async function persistStreak(
  store: DataStore,
  userId: string,
  evaluation: ReturnType<typeof evaluateSavingsStreak>,
) {
  await store.replaceStreakWeeks(
    userId,
    evaluation.history.map((week) => ({
      userId,
      weekStart: week.weekStart,
      increased: week.increased,
      startCents: week.startCents,
      endCents: week.endCents,
    })),
  );
  await store.saveSavingsStreak({
    userId,
    currentStreak: evaluation.currentStreak,
    longestStreak: evaluation.longestStreak,
    updatedAt: new Date().toISOString(),
  });
}

export async function recomputeStreak(store: DataStore, userId: string) {
  const snapshots = await store.listBalanceSnapshots(userId);
  const evaluation = evaluateSavingsStreak(snapshots, todayIso());
  await persistStreak(store, userId, evaluation);
  return toPublicStreak(evaluation);
}

export async function readStreak(store: DataStore, userId: string) {
  const [snapshots, stored] = await Promise.all([
    store.listBalanceSnapshots(userId),
    store.getSavingsStreak(userId),
  ]);
  const evaluation = evaluateSavingsStreak(snapshots, todayIso());
  if (
    !stored ||
    stored.currentStreak !== evaluation.currentStreak ||
    stored.longestStreak !== evaluation.longestStreak
  ) {
    await persistStreak(store, userId, evaluation);
  }
  return toPublicStreak(evaluation);
}
