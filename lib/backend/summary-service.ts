import { randomUUID } from "node:crypto";
import { getModelQueue } from "@/lib/openrouter";
import { requireActiveAccount } from "./goals-service";
import { addIsoDays, CATEGORY_LABELS, mondayOf, weekBounds } from "./habits";
import type { ExpenseCategory } from "./expense-types";
import type { WeeklySummaryRecord } from "./habit-types";
import type { DataStore } from "./store";
import type { UserRecord } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const TIPS: Record<ExpenseCategory, string> = {
  food: "Choose two days this week to eat what you already have before ordering out. Move the money you skip spending toward your savings goal the same day.",
  transport: "Mark the trips you already know about and use a cheaper option for one of them. A single shared ride or bus trip is enough to change the week.",
  school: "List the school charges you can already see this month and set a little aside before the due date. Spreading them out keeps them from landing all at once.",
  entertainment: "Pick the one event you most want this month and let the smaller extras wait. Naming the fun you care about makes the rest easier to skip.",
  shopping: "Wait a day before the next nonessential purchase. If you still want it tomorrow, buy it on purpose. If not, send that amount to your goal.",
  other: "Choose one purchase to skip this week and move that amount into savings the same day. A specific skip is easier to keep than a vague plan to spend less.",
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function toPublic(summary: WeeklySummaryRecord) {
  return {
    id: summary.id,
    weekStart: summary.weekStart,
    weekEnd: weekBounds(summary.weekStart).to,
    spending: summary.spendingCents / 100,
    previousSpending:
      summary.previousSpendingCents == null
        ? null
        : summary.previousSpendingCents / 100,
    topCategories: summary.topCategories.map((item) => ({
      category: item.category,
      label: CATEGORY_LABELS[item.category],
      amount: item.amountCents / 100,
    })),
    goalNote: summary.goalNote,
    streakNote: summary.streakNote,
    tip: summary.tip,
    body: summary.body,
    hadActivity: summary.hadActivity,
    source: summary.source,
    createdAt: summary.createdAt,
  };
}

async function spendingForWeek(store: DataStore, userId: string, from: string, to: string) {
  const [expenses, statements] = await Promise.all([
    store.listExpenses(userId),
    store.listStatementTransactions(userId),
  ]);
  const totals = new Map<ExpenseCategory, number>();
  let spendingCents = 0;
  for (const expense of [...expenses, ...statements]) {
    if (expense.purchaseDate < from || expense.purchaseDate > to) {
      continue;
    }
    spendingCents += expense.amountCents;
    totals.set(
      expense.category,
      (totals.get(expense.category) ?? 0) + expense.amountCents,
    );
  }
  const topCategories = [...totals.entries()]
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
  return { spendingCents, topCategories };
}

function fallbackCopy(input: {
  spendingCents: number;
  previousSpendingCents: number | null;
  top: { category: ExpenseCategory; amountCents: number } | null;
  goalNote: string;
  streakNote: string;
  hadActivity: boolean;
}) {
  if (!input.hadActivity) {
    return {
      body: "You had no spending or savings activity this week, so there is no new insight to add.",
      tip: "Scan a receipt or refresh your linked bank when you are ready for a weekly summary.",
    };
  }
  const topLabel = input.top ? CATEGORY_LABELS[input.top.category] : "Other";
  const change =
    input.previousSpendingCents == null
      ? "There is no earlier week to compare yet."
      : input.spendingCents === input.previousSpendingCents
        ? "Spending matches last week."
        : input.spendingCents > input.previousSpendingCents
          ? `Spending is ${money(input.spendingCents - input.previousSpendingCents)} more than last week.`
          : `Spending is ${money(input.previousSpendingCents - input.spendingCents)} less than last week.`;
  const topSentence = input.top
    ? `The largest category was ${topLabel} at ${money(input.top.amountCents)}.`
    : "No single category stood out.";
  return {
    body: `This week you spent ${money(input.spendingCents)}. ${topSentence} ${change} ${input.goalNote} ${input.streakNote}`,
    tip: TIPS[input.top?.category ?? "other"],
  };
}

async function writeWithAi(facts: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  for (const model of getModelQueue()) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://savestreak.org",
          "X-Title": "$aveStreak",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You write a short weekly money summary for a college student. Return ONLY JSON. Do not give investment, credit, tax, or professional financial advice. Do not use em dashes. Never mention being an AI model.",
            },
            {
              role: "user",
              content: `${facts}

Return JSON:
{"body":"3 short sentences covering total spending, the top category, the change from last week, goal progress, and streak status.","tip":"one practical tip in 2 sentences based on this week's spending."}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        continue;
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start === -1 || end === -1) {
        continue;
      }
      const parsed = JSON.parse(content.slice(start, end + 1)) as {
        body?: string;
        tip?: string;
      };
      if (!parsed.body?.trim() || !parsed.tip?.trim()) {
        continue;
      }
      return {
        body: parsed.body.replaceAll("—", ", ").trim(),
        tip: parsed.tip.replaceAll("—", ", ").trim(),
      };
    } catch {
      // Try the next model, then the written fallback.
    }
  }
  return null;
}

export async function listSummaries(store: DataStore, user: UserRecord) {
  requireActiveAccount(user);
  const summaries = await store.listWeeklySummaries(user.id);
  return summaries.map(toPublic);
}

export async function generateWeeklySummary(
  store: DataStore,
  user: UserRecord,
  input: { weekStart?: string; today?: string; refresh?: boolean },
) {
  requireActiveAccount(user);
  const today =
    input.today && /^\d{4}-\d{2}-\d{2}$/.test(input.today)
      ? input.today
      : new Date().toISOString().slice(0, 10);
  const weekStart =
    input.weekStart && /^\d{4}-\d{2}-\d{2}$/.test(input.weekStart)
      ? mondayOf(input.weekStart)
      : mondayOf(today);
  const existing = await store.getWeeklySummary(user.id, weekStart);
  if (existing && !input.refresh) {
    return toPublic(existing);
  }

  const bounds = weekBounds(weekStart);
  const previous = weekBounds(addIsoDays(weekStart, -7));
  const [current, prior, goals, accounts, streak, snapshots] = await Promise.all([
    spendingForWeek(store, user.id, bounds.from, bounds.to),
    spendingForWeek(store, user.id, previous.from, previous.to),
    store.listGoals(user.id),
    store.listBankAccounts(user.id),
    store.getSavingsStreak(user.id),
    store.listBalanceSnapshots(user.id),
  ]);

  const weekSnapshots = snapshots.filter((snapshot) => {
    const day = snapshot.capturedAt.slice(0, 10);
    return day >= bounds.from && day <= bounds.to;
  });
  const balanceMoved =
    weekSnapshots.length >= 2 &&
    weekSnapshots[weekSnapshots.length - 1]!.savingsCents !==
      weekSnapshots[0]!.savingsCents;
  const hadActivity = current.spendingCents > 0 || balanceMoved;

  const goalNote =
    goals.length === 0
      ? "You do not have a savings goal yet."
      : goals
          .slice(0, 3)
          .map((goal) => {
            const linked = goal.linkedAccountId
              ? accounts.find((account) => account.id === goal.linkedAccountId)
              : null;
            const saved =
              linked != null
                ? Math.max(0, linked.balanceCents)
                : goal.currentAmountCents;
            const percent =
              goal.targetAmountCents > 0
                ? Math.min(100, Math.round((saved / goal.targetAmountCents) * 100))
                : 0;
            return `${goal.name} is ${percent}% funded.`;
          })
          .join(" ");
  const streakNote = streak
    ? `Your current savings streak is ${streak.currentStreak} week${streak.currentStreak === 1 ? "" : "s"}, and your longest is ${streak.longestStreak}.`
    : "Your savings streak has not started yet.";
  const top = current.topCategories[0] ?? null;
  const written = fallbackCopy({
    spendingCents: current.spendingCents,
    previousSpendingCents: prior.spendingCents,
    top,
    goalNote,
    streakNote,
    hadActivity,
  });

  let body = written.body;
  let tip = written.tip;
  let source: "ai" | "fallback" = "fallback";
  if (hadActivity) {
    const ai = await writeWithAi(
      [
        `Week of ${bounds.from} to ${bounds.to}.`,
        `Total spending: ${money(current.spendingCents)}.`,
        `Previous week spending: ${money(prior.spendingCents)}.`,
        top
          ? `Top category: ${CATEGORY_LABELS[top.category]} ${money(top.amountCents)}.`
          : "No category totals.",
        goalNote,
        streakNote,
      ].join("\n"),
    );
    if (ai) {
      body = ai.body;
      tip = ai.tip;
      source = "ai";
    }
  }

  const record: WeeklySummaryRecord = {
    id: existing?.id ?? randomUUID(),
    userId: user.id,
    weekStart,
    spendingCents: current.spendingCents,
    previousSpendingCents: prior.spendingCents,
    topCategories: current.topCategories.slice(0, 3),
    goalNote,
    streakNote,
    tip,
    body,
    hadActivity,
    source,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await store.saveWeeklySummary(record);
  return toPublic(record);
}
