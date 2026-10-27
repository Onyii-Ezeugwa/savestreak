import type { ExpenseCategory } from "./expense-types";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "Food",
  transport: "Transport",
  school: "School",
  entertainment: "Entertainment",
  shopping: "Shopping",
  other: "Other",
};

const CATEGORIES = new Set<string>(Object.keys(CATEGORY_LABELS));

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return CATEGORIES.has(value);
}

export function addIsoDays(iso: string, days: number) {
  const match = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return iso.slice(0, 10);
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the calendar week that contains this YYYY-MM-DD date. */
export function mondayOf(isoDate: string) {
  const match = isoDate.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return isoDate.slice(0, 10);
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

export function weekBounds(isoDate: string) {
  const from = mondayOf(isoDate);
  return { from, to: addIsoDays(from, 6) };
}

export function monthBounds(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  const from = `${isoDate.slice(0, 7)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export interface SavingsSnapshotInput {
  capturedAt: string;
  savingsCents: number;
}

export interface StreakWeekResult {
  weekStart: string;
  increased: boolean;
  startCents: number;
  endCents: number;
}

export interface StreakEvaluation {
  currentStreak: number;
  longestStreak: number;
  history: StreakWeekResult[];
}

function eachMonday(from: string, through: string) {
  const weeks: string[] = [];
  let cursor = from;
  while (cursor <= through) {
    weeks.push(cursor);
    cursor = addIsoDays(cursor, 7);
  }
  return weeks;
}

/**
 * A week counts when the last savings balance is higher than the week started.
 * A finished week with no increase resets the streak. The current week does
 * not reset it until that week is over.
 */
export function evaluateSavingsStreak(
  snapshots: SavingsSnapshotInput[],
  todayIso: string,
): StreakEvaluation {
  const ordered = [...snapshots].sort((a, b) =>
    a.capturedAt.localeCompare(b.capturedAt),
  );
  const byWeek = new Map<
    string,
    { first: number; last: number; firstAt: string; lastAt: string }
  >();

  for (const snapshot of ordered) {
    const day = snapshot.capturedAt.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}/.test(day)) {
      continue;
    }
    const week = mondayOf(day);
    const entry = byWeek.get(week);
    if (!entry) {
      byWeek.set(week, {
        first: snapshot.savingsCents,
        last: snapshot.savingsCents,
        firstAt: snapshot.capturedAt,
        lastAt: snapshot.capturedAt,
      });
      continue;
    }
    if (snapshot.capturedAt < entry.firstAt) {
      entry.first = snapshot.savingsCents;
      entry.firstAt = snapshot.capturedAt;
    }
    if (snapshot.capturedAt >= entry.lastAt) {
      entry.last = snapshot.savingsCents;
      entry.lastAt = snapshot.capturedAt;
    }
  }

  if (byWeek.size === 0) {
    return { currentStreak: 0, longestStreak: 0, history: [] };
  }

  const weeks = [...byWeek.keys()].sort();
  const currentWeek = mondayOf(todayIso);
  const lastWeek = weeks[weeks.length - 1]! > currentWeek
    ? weeks[weeks.length - 1]!
    : currentWeek;
  const mondays = eachMonday(weeks[0]!, lastWeek);

  let previousEnd: number | null = null;
  let streak = 0;
  let longest = 0;
  const history: StreakWeekResult[] = [];

  for (const week of mondays) {
    const entry = byWeek.get(week);
    const isCurrent = week === currentWeek;
    if (!entry) {
      if (!isCurrent && previousEnd != null) {
        history.push({
          weekStart: week,
          increased: false,
          startCents: previousEnd,
          endCents: previousEnd,
        });
        streak = 0;
      }
      continue;
    }

    const start = previousEnd ?? entry.first;
    const end = entry.last;
    const increased = end > start;
    previousEnd = end;
    history.push({
      weekStart: week,
      increased,
      startCents: start,
      endCents: end,
    });
    if (increased) {
      streak += 1;
      longest = Math.max(longest, streak);
    } else if (!isCurrent) {
      streak = 0;
    }
  }

  return { currentStreak: streak, longestStreak: longest, history };
}

export interface ParsedStatementRow {
  purchaseDate: string;
  merchant: string;
  amountCents: number;
  category: ExpenseCategory;
}

function parseStatementDate(raw: string): string | null {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!us) {
    return null;
  }
  const month = Number(us[1]);
  const day = Number(us[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${us[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseStatementAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const amount = Math.abs(Number(cleaned));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return Math.round(amount * 100);
}

/** Read a bank statement CSV: date, merchant, amount, and an optional category. */
export function parseStatementCsv(text: string): ParsedStatementRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: ParsedStatementRow[] = [];
  for (const line of lines) {
    const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    if (cells.length < 3) {
      continue;
    }
    const purchaseDate = parseStatementDate(cells[0] ?? "");
    if (!purchaseDate) {
      continue;
    }
    const merchant = (cells[1] ?? "").replace(/\s+/g, " ").slice(0, 80);
    const amountCents = parseStatementAmount(cells[2] ?? "");
    if (!merchant || amountCents == null) {
      continue;
    }
    const categoryRaw = (cells[3] ?? "other").toLowerCase();
    const category = isExpenseCategory(categoryRaw) ? categoryRaw : "other";
    rows.push({ purchaseDate, merchant, amountCents, category });
    if (rows.length >= 200) {
      break;
    }
  }
  return rows;
}
