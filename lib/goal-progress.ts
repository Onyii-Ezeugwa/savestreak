import { parseDateOnly, startOfToday } from "@/lib/dates";

export type GoalPace = "complete" | "on_track" | "behind";

export function goalProgressPercent(
  currentAmountCents: number,
  targetAmountCents: number,
) {
  if (targetAmountCents <= 0) {
    return 0;
  }
  return Math.min(
    100,
    Math.round((currentAmountCents / targetAmountCents) * 100),
  );
}

export function goalRemainingCents(
  currentAmountCents: number,
  targetAmountCents: number,
) {
  return Math.max(0, targetAmountCents - currentAmountCents);
}

export function goalIsComplete(
  currentAmountCents: number,
  targetAmountCents: number,
) {
  return targetAmountCents > 0 && currentAmountCents >= targetAmountCents;
}

export function goalPaceStatus(input: {
  currentAmountCents: number;
  targetAmountCents: number;
  targetDate: string;
  createdAt: string;
  today?: Date;
}): GoalPace {
  if (goalIsComplete(input.currentAmountCents, input.targetAmountCents)) {
    return "complete";
  }

  const today = input.today ?? startOfToday();
  const target = parseDateOnly(input.targetDate);
  const createdDay = parseDateOnly(input.createdAt.slice(0, 10));
  if (!target || !createdDay) {
    return "on_track";
  }

  if (today > target) {
    return "behind";
  }

  const totalDays = Math.max(
    1,
    Math.round((target.getTime() - createdDay.getTime()) / 86_400_000),
  );
  const elapsedDays = Math.min(
    totalDays,
    Math.max(
      0,
      Math.round((today.getTime() - createdDay.getTime()) / 86_400_000),
    ),
  );
  const expectedCents = Math.round(
    (elapsedDays / totalDays) * input.targetAmountCents,
  );

  return input.currentAmountCents >= expectedCents ? "on_track" : "behind";
}

export function requiredSavings(input: {
  currentAmountCents: number;
  targetAmountCents: number;
  targetDate: string;
  today?: Date;
}) {
  const target = parseDateOnly(input.targetDate);
  const today = input.today ?? startOfToday();
  if (!target || target < today || input.targetAmountCents <= 0) {
    return null;
  }
  const remainingCents = goalRemainingCents(
    input.currentAmountCents,
    input.targetAmountCents,
  );
  const days = Math.max(
    1,
    Math.round((target.getTime() - today.getTime()) / 86_400_000),
  );
  const weeks = Math.max(1, Math.ceil(days / 7));
  const months = Math.max(1, Math.ceil(days / 30));
  return {
    remainingCents,
    weeklyCents: Math.ceil(remainingCents / weeks),
    monthlyCents: Math.ceil(remainingCents / months),
  };
}
