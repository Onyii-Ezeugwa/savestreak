import type { SavingsFrequency } from "./savings";

export const GOAL_EXAMPLES = [
  "Laptop",
  "Emergency Fund",
  "Trip",
  "Tuition",
  "Car",
  "Other",
] as const;

export type GoalExample = (typeof GOAL_EXAMPLES)[number];
export type { SavingsFrequency };

export interface GoalPlanRequest {
  goalName: string;
  amount: number;
  targetDate: string;
  savingsAmount?: number;
  savingsFrequency?: SavingsFrequency;
}

export interface GoalPlanMilestone {
  week: number;
  amount: number;
  note: string;
}

export interface GoalPlan {
  goal: string;
  target: number;
  timelineWeeks: number;
  weeklySavings: number;
  cadenceAmount: number;
  cadenceFrequency: SavingsFrequency;
  summary: string;
  milestones: GoalPlanMilestone[];
  suggestions: string[];
  source: "ai" | "mock";
}

export interface GoalPlanError {
  error: string;
  fieldErrors?: Record<string, string>;
  remainingUses?: number;
}

export interface GoalPlanResponse extends GoalPlan {
  remainingUses: number;
}

export type AgeGroup = "adult" | "minor" | null;
