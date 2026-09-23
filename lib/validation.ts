import { parseDateOnly, startOfToday } from "./dates";
import { isSavingsFrequency, type SavingsFrequency } from "./savings";
import type { GoalPlanRequest } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  data?: GoalPlanRequest;
}

export function validateGoalPlanInput(input: {
  goalName?: unknown;
  amount?: unknown;
  targetDate?: unknown;
  savingsAmount?: unknown;
  savingsFrequency?: unknown;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const goalName =
    typeof input.goalName === "string" ? input.goalName.trim() : "";

  if (!goalName) {
    errors.goalName = "Tell us what you are saving for.";
  } else if (goalName.length > 80) {
    errors.goalName = "Keep the goal name under 80 characters.";
  }

  const amount =
    typeof input.amount === "number"
      ? input.amount
      : typeof input.amount === "string"
        ? Number(input.amount)
        : NaN;

  if (!Number.isFinite(amount)) {
    errors.amount = "Enter a valid goal amount.";
  } else if (amount <= 0) {
    errors.amount = "Goal amount must be greater than $0.";
  } else if (amount > 1_000_000) {
    errors.amount = "Enter an amount under $1,000,000.";
  }

  const targetDate =
    typeof input.targetDate === "string" ? input.targetDate : "";
  const parsedDate = parseDateOnly(targetDate);

  if (!targetDate) {
    errors.targetDate = "Choose a target date.";
  } else if (!parsedDate) {
    errors.targetDate = "Enter a valid date.";
  } else if (parsedDate <= startOfToday()) {
    errors.targetDate = "Choose a date in the future.";
  }

  let savingsAmount: number | undefined;
  let savingsFrequency: SavingsFrequency | undefined;

  if (
    input.savingsAmount !== undefined &&
    input.savingsAmount !== null &&
    input.savingsAmount !== ""
  ) {
    savingsAmount =
      typeof input.savingsAmount === "number"
        ? input.savingsAmount
        : Number(input.savingsAmount);

    if (!Number.isFinite(savingsAmount)) {
      errors.savingsAmount = "Enter a valid savings amount.";
    } else if (savingsAmount <= 0) {
      errors.savingsAmount = "Savings amount must be greater than $0.";
    } else if (savingsAmount > 50_000) {
      errors.savingsAmount = "Enter an amount under $50,000.";
    }

    savingsFrequency = isSavingsFrequency(input.savingsFrequency)
      ? input.savingsFrequency
      : "week";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      goalName,
      amount: Math.round(amount * 100) / 100,
      targetDate,
      ...(savingsAmount !== undefined && savingsFrequency
        ? {
            savingsAmount: Math.round(savingsAmount * 100) / 100,
            savingsFrequency,
          }
        : {}),
    },
  };
}

export function weeksUntil(targetDate: string): number {
  const parsed = parseDateOnly(targetDate);
  if (!parsed) {
    return 1;
  }

  const diff = parsed.getTime() - startOfToday().getTime();
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
}

export { tomorrowDateInputValue } from "./dates";
