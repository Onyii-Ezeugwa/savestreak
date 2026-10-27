export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
}

export interface StreakBadgeDefinition extends BadgeDefinition {
  weeks: number;
}

const MILESTONE_BADGES: BadgeDefinition[] = [
  {
    id: "first-goal",
    name: "First goal",
    description: "Created a first savings goal.",
  },
  {
    id: "halfway",
    name: "Halfway there",
    description: "Reached 50% of a savings goal.",
  },
  {
    id: "goal-complete",
    name: "Goal complete",
    description: "Finished a savings goal.",
  },
  {
    id: "first-lesson",
    name: "First lesson",
    description: "Read a first financial lesson.",
  },
];

export const STREAK_BADGES: StreakBadgeDefinition[] = [
  {
    id: "streak-1",
    name: "First rise",
    description: "Savings went up for a full week.",
    weeks: 1,
  },
  {
    id: "streak-2",
    name: "Back to back",
    description: "Savings went up two weeks in a row.",
    weeks: 2,
  },
  {
    id: "streak-4",
    name: "Month of more",
    description: "Savings went up for four weeks in a row.",
    weeks: 4,
  },
  {
    id: "streak-8",
    name: "Long burn",
    description: "Savings went up for eight weeks in a row.",
    weeks: 8,
  },
  {
    id: "streak-12",
    name: "Season saved",
    description: "Savings went up for twelve weeks in a row.",
    weeks: 12,
  },
  {
    id: "streak-26",
    name: "Half-year habit",
    description: "Savings went up for twenty-six weeks in a row.",
    weeks: 26,
  },
  {
    id: "streak-52",
    name: "Year of saving",
    description: "Savings went up for a full year.",
    weeks: 52,
  },
];

export const BADGES: BadgeDefinition[] = [...MILESTONE_BADGES, ...STREAK_BADGES];

export function badgeById(id: string) {
  return BADGES.find((badge) => badge.id === id) ?? null;
}

export function streakBadgeById(id: string) {
  return STREAK_BADGES.find((badge) => badge.id === id) ?? null;
}
