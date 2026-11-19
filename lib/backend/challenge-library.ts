import type { ExpenseCategory } from "./expense-types";
import { addIsoDays, mondayOf } from "./habits";

export interface ChallengeDefinition {
  id: string;
  title: string;
  detail: string;
  kind: "save" | "spend_under";
  category: ExpenseCategory | null;
  targetCents: number;
}

export const CHALLENGES: ChallengeDefinition[] = [
  {
    id: "save-20",
    title: "Save $20 this week",
    detail: "Grow the savings balance by $20 between the first and last reading this week.",
    kind: "save",
    category: null,
    targetCents: 2000,
  },
  {
    id: "save-10",
    title: "Save $10 this week",
    detail: "Grow the savings balance by $10 between the first and last reading this week.",
    kind: "save",
    category: null,
    targetCents: 1000,
  },
  {
    id: "food-30",
    title: "Spend under $30 on food",
    detail: "Keep food purchases, including receipts and statement rows, at $30 or less.",
    kind: "spend_under",
    category: "food",
    targetCents: 3000,
  },
  {
    id: "transport-20",
    title: "Spend under $20 on transport",
    detail: "Keep transport purchases at $20 or less.",
    kind: "spend_under",
    category: "transport",
    targetCents: 2000,
  },
  {
    id: "shopping-25",
    title: "Spend under $25 on shopping",
    detail: "Keep shopping purchases at $25 or less.",
    kind: "spend_under",
    category: "shopping",
    targetCents: 2500,
  },
  {
    id: "entertainment-15",
    title: "Spend under $15 on entertainment",
    detail: "Keep entertainment purchases at $15 or less.",
    kind: "spend_under",
    category: "entertainment",
    targetCents: 1500,
  },
];

const BY_ID = new Map(CHALLENGES.map((item) => [item.id, item]));

export function challengeById(id: string) {
  return BY_ID.get(id) ?? null;
}

export function challengesForWeek(weekStart: string) {
  const monday = mondayOf(weekStart);
  const epoch = Date.parse("2026-01-05T00:00:00Z");
  const current = Date.parse(`${monday}T00:00:00Z`);
  const weekIndex = Math.round((current - epoch) / (7 * 86_400_000));
  const start = ((weekIndex % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length;
  return [0, 1, 2].map((offset) => CHALLENGES[(start + offset) % CHALLENGES.length]!);
}

export interface ChallengeScore {
  progressCents: number;
  measured: boolean;
  completed: boolean;
}

export function scoreChallenge(input: {
  challenge: ChallengeDefinition;
  weekStart: string;
  spending: Array<{ purchaseDate: string; amountCents: number; category: ExpenseCategory }>;
  snapshots: Array<{ capturedAt: string; savingsCents: number }>;
  hasSpendingHistory: boolean;
}): ChallengeScore {
  const from = mondayOf(input.weekStart);
  const to = addIsoDays(from, 6);
  if (input.challenge.kind === "save") {
    const points = input.snapshots
      .filter((item) => {
        const day = item.capturedAt.slice(0, 10);
        return day >= from && day <= to;
      })
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    if (points.length < 2) {
      return { progressCents: 0, measured: false, completed: false };
    }
    const progressCents = Math.max(
      0,
      points[points.length - 1]!.savingsCents - points[0]!.savingsCents,
    );
    return {
      progressCents,
      measured: true,
      completed: progressCents >= input.challenge.targetCents,
    };
  }

  if (!input.hasSpendingHistory) {
    return { progressCents: 0, measured: false, completed: false };
  }
  const spent = input.spending
    .filter((item) => item.purchaseDate >= from && item.purchaseDate <= to)
    .filter((item) => item.category === input.challenge.category)
    .reduce((sum, item) => sum + item.amountCents, 0);
  return {
    progressCents: spent,
    measured: true,
    completed: spent <= input.challenge.targetCents,
  };
}
