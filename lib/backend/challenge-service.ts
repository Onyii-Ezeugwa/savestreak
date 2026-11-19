import { randomUUID } from "node:crypto";
import { formatDateInputValue, startOfToday } from "@/lib/dates";
import { requireActiveAccount } from "./goals-service";
import {
  challengeById,
  challengesForWeek,
  scoreChallenge,
  type ChallengeDefinition,
} from "./challenge-library";
import { addIsoDays, mondayOf, weekBounds } from "./habits";
import type { ChallengeParticipationRecord } from "./habit-types";
import type { DataStore } from "./store";
import { ApiError, type UserRecord } from "./types";

function todayOr(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return formatDateInputValue(startOfToday());
}

function toPublic(
  challenge: ChallengeDefinition,
  participation: ChallengeParticipationRecord | null,
  live: { progressCents: number; measured: boolean; completed: boolean },
  weekStart: string,
) {
  const closed = participation != null && participation.status !== "active";
  const progressCents = closed ? participation.progressCents : live.progressCents;
  const measured = closed ? participation.measured : live.measured;
  const status = participation?.status ?? "open";
  return {
    id: challenge.id,
    title: challenge.title,
    detail: challenge.detail,
    kind: challenge.kind,
    target: challenge.targetCents / 100,
    weekStart,
    weekEnd: addIsoDays(mondayOf(weekStart), 6),
    joined: participation != null,
    status,
    progress: progressCents / 100,
    measured,
    completed: status === "completed" || (!closed && live.completed),
  };
}

async function evidence(store: DataStore, userId: string) {
  const [expenses, statements, snapshots] = await Promise.all([
    store.listExpenses(userId),
    store.listStatementTransactions(userId),
    store.listBalanceSnapshots(userId),
  ]);
  return {
    spending: [...expenses, ...statements].map((item) => ({
      purchaseDate: item.purchaseDate,
      amountCents: item.amountCents,
      category: item.category,
    })),
    snapshots: snapshots.map((item) => ({
      capturedAt: item.capturedAt,
      savingsCents: item.savingsCents,
    })),
    hasSpendingHistory: expenses.length + statements.length > 0,
  };
}

export async function listChallenges(
  store: DataStore,
  user: UserRecord,
  todayInput?: string,
) {
  requireActiveAccount(user);
  const today = todayOr(todayInput);
  const currentWeek = mondayOf(today);
  await closeFinishedChallenges(store, user.id, today);
  const rows = await store.listChallengeParticipations(user.id);
  const facts = await evidence(store, user.id);
  const current = challengesForWeek(currentWeek).map((challenge) => {
    const participation =
      rows.find(
        (item) => item.weekStart === currentWeek && item.challengeId === challenge.id,
      ) ?? null;
    const live = scoreChallenge({ challenge, weekStart: currentWeek, ...facts });
    return toPublic(challenge, participation, live, currentWeek);
  });
  const history = rows
    .filter((item) => item.status !== "active")
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.challengeId.localeCompare(b.challengeId))
    .map((item) => {
      const challenge = challengeById(item.challengeId);
      return {
        id: item.id,
        challengeId: item.challengeId,
        title: challenge?.title ?? item.challengeId,
        weekStart: item.weekStart,
        weekEnd: addIsoDays(item.weekStart, 6),
        status: item.status,
        progress: item.progressCents / 100,
        target: (challenge?.targetCents ?? 0) / 100,
        measured: item.measured,
      };
    });
  const bounds = weekBounds(currentWeek);
  return {
    weekStart: bounds.from,
    weekEnd: bounds.to,
    challenges: current,
    history,
  };
}

export async function joinChallenge(
  store: DataStore,
  user: UserRecord,
  challengeId: string,
  todayInput?: string,
) {
  requireActiveAccount(user);
  const today = todayOr(todayInput);
  const weekStart = mondayOf(today);
  const challenge = challengesForWeek(weekStart).find((item) => item.id === challengeId);
  if (!challenge) {
    throw new ApiError(400, "That challenge is not open this week.");
  }
  const existing = (await store.listChallengeParticipations(user.id)).find(
    (item) => item.weekStart === weekStart && item.challengeId === challengeId,
  );
  if (!existing) {
    await store.createChallengeParticipation({
      id: randomUUID(),
      userId: user.id,
      weekStart,
      challengeId,
      joinedAt: new Date().toISOString(),
      status: "active",
      progressCents: 0,
      measured: false,
      closedAt: null,
    });
  }
  return listChallenges(store, user, today);
}

export async function closeFinishedChallenges(
  store: DataStore,
  userId: string,
  today: string,
) {
  const rows = await store.listChallengeParticipations(userId);
  const open = rows.filter((item) => item.status === "active" && addIsoDays(item.weekStart, 6) < today);
  if (open.length === 0) {
    return 0;
  }
  const facts = await evidence(store, userId);
  const closedAt = new Date().toISOString();
  for (const item of open) {
    const challenge = challengeById(item.challengeId);
    if (!challenge) {
      continue;
    }
    const score = scoreChallenge({ challenge, weekStart: item.weekStart, ...facts });
    await store.updateChallengeParticipation({
      ...item,
      status: score.completed ? "completed" : "missed",
      progressCents: score.progressCents,
      measured: score.measured,
      closedAt,
    });
  }
  return open.length;
}
