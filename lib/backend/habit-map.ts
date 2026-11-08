import type { ExpenseCategory } from "./expense-types";
import { isExpenseCategory } from "./habits";
import type {
  BalanceSnapshotRecord,
  LessonReadRecord,
  LessonRecord,
  LessonSaveRecord,
  SavingsStreakRecord,
  StatementTransactionRecord,
  StreakWeekRecord,
  UserBadgeRecord,
  WeeklySummaryRecord,
} from "./habit-types";

function day(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const date = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  }
  const match = String(value ?? "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function timestamp(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = String(value ?? "").trim();
  const match = text.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (!match) {
    return text;
  }
  const zone = match[3] ? match[3].replace(/([+-]\d{2})(\d{2})$/, "$1:$2") : "Z";
  return `${match[1]}T${match[2]}${zone}`;
}

export function mapSnapshot(row: Record<string, unknown>): BalanceSnapshotRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    capturedAt: timestamp(row.captured_at),
    savingsCents: Number(row.savings_cents),
    assetsCents: row.assets_cents == null ? null : Number(row.assets_cents),
    debtsCents: row.debts_cents == null ? null : Number(row.debts_cents),
    netWorthCents: row.net_worth_cents == null ? null : Number(row.net_worth_cents),
  };
}

export function mapStreakWeek(row: Record<string, unknown>): StreakWeekRecord {
  return {
    userId: String(row.user_id),
    weekStart: day(row.week_start),
    increased: Boolean(row.increased),
    startCents: Number(row.start_cents),
    endCents: Number(row.end_cents),
  };
}

export function mapSavingsStreak(row: Record<string, unknown>): SavingsStreakRecord {
  return {
    userId: String(row.user_id),
    currentStreak: Number(row.current_streak),
    longestStreak: Number(row.longest_streak),
    updatedAt: String(row.updated_at),
  };
}

export function mapStatement(row: Record<string, unknown>): StatementTransactionRecord {
  const category = String(row.category);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    merchant: String(row.merchant),
    purchaseDate: day(row.purchase_date),
    amountCents: Number(row.amount_cents),
    category: isExpenseCategory(category) ? category : "other",
    createdAt: String(row.created_at),
  };
}

export function mapLesson(row: Record<string, unknown>): LessonRecord {
  const topics = Array.isArray(row.topics)
    ? row.topics.map((topic) => String(topic))
    : [];
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body),
    takeaway: String(row.takeaway),
    topics,
    minutes: Number(row.minutes),
    youtubeUrl: String(row.youtube_url ?? ""),
    youtubeLabel: String(row.youtube_label ?? ""),
    contextKey: String(row.context_key ?? ""),
  };
}

export function mapLessonRead(row: Record<string, unknown>): LessonReadRecord {
  return {
    userId: String(row.user_id),
    lessonId: String(row.lesson_id),
    readAt: String(row.read_at),
  };
}

export function mapLessonSave(row: Record<string, unknown>): LessonSaveRecord {
  return {
    userId: String(row.user_id),
    lessonId: String(row.lesson_id),
    savedAt: String(row.saved_at),
  };
}

export function mapBadge(row: Record<string, unknown>): UserBadgeRecord {
  return {
    userId: String(row.user_id),
    badgeId: String(row.badge_id),
    earnedAt: String(row.earned_at),
  };
}

export function mapSummary(row: Record<string, unknown>): WeeklySummaryRecord {
  const categories = Array.isArray(row.top_categories) ? row.top_categories : [];
  return {
    id: String(row.id),
    userId: String(row.user_id),
    weekStart: day(row.week_start),
    spendingCents: Number(row.spending_cents),
    previousSpendingCents:
      row.previous_spending_cents == null
        ? null
        : Number(row.previous_spending_cents),
    topCategories: categories.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const category = String((item as { category?: string }).category ?? "");
      const amountCents = Number((item as { amountCents?: number }).amountCents);
      if (!isExpenseCategory(category) || !Number.isFinite(amountCents)) {
        return [];
      }
      return [{ category: category as ExpenseCategory, amountCents }];
    }),
    goalNote: String(row.goal_note),
    streakNote: String(row.streak_note),
    tip: String(row.tip),
    body: String(row.body),
    hadActivity: Boolean(row.had_activity),
    source: row.source === "ai" ? "ai" : "fallback",
    createdAt: String(row.created_at),
  };
}
