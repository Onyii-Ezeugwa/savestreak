export const PLANNER_TRIAL_LIMIT = 5;
export const PLANNER_USAGE_COOKIE = "savestreak_planner_uses";
export const PLANNER_USAGE_MAX_AGE = 60 * 60 * 24 * 90;

export interface PlannerTrialStatus {
  used: number;
  remaining: number;
  limit: number;
}

export function parsePlannerUses(value: string | undefined): number {
  const used = Number(value);
  if (!Number.isInteger(used) || used < 0) {
    return 0;
  }
  return Math.min(used, PLANNER_TRIAL_LIMIT);
}

export function getPlannerTrialStatus(used: number): PlannerTrialStatus {
  const safeUsed = Math.min(Math.max(used, 0), PLANNER_TRIAL_LIMIT);
  return {
    used: safeUsed,
    remaining: PLANNER_TRIAL_LIMIT - safeUsed,
    limit: PLANNER_TRIAL_LIMIT,
  };
}
