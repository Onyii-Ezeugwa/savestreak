import type { ExpenseCategory } from "./expense-types";
import type { LessonDefinition } from "./lessons-catalog";

export interface BalanceSnapshotRecord {
  id: string;
  userId: string;
  capturedAt: string;
  savingsCents: number;
  assetsCents: number | null;
  debtsCents: number | null;
  netWorthCents: number | null;
}

export interface StreakWeekRecord {
  userId: string;
  weekStart: string;
  increased: boolean;
  startCents: number;
  endCents: number;
}

export interface SavingsStreakRecord {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  updatedAt: string;
}

export interface StatementTransactionRecord {
  id: string;
  userId: string;
  merchant: string;
  purchaseDate: string;
  amountCents: number;
  category: ExpenseCategory;
  createdAt: string;
}

export interface LessonRecord extends LessonDefinition {
  youtubeUrl: string;
  youtubeLabel: string;
  contextKey: string;
}

export interface LessonReadRecord {
  userId: string;
  lessonId: string;
  readAt: string;
}

export interface LessonSaveRecord {
  userId: string;
  lessonId: string;
  savedAt: string;
}

export interface UserBadgeRecord {
  userId: string;
  badgeId: string;
  earnedAt: string;
}

export interface WeeklySummaryRecord {
  id: string;
  userId: string;
  weekStart: string;
  spendingCents: number;
  previousSpendingCents: number | null;
  topCategories: Array<{ category: ExpenseCategory; amountCents: number }>;
  goalNote: string;
  streakNote: string;
  tip: string;
  body: string;
  hadActivity: boolean;
  source: "ai" | "fallback";
  createdAt: string;
}

export interface PublicTransaction {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  source: "receipt" | "statement";
}
