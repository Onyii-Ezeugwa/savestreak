import { getModelQueue } from "@/lib/openrouter";
import { addCalendarDays, formatDateInputValue, startOfToday } from "@/lib/dates";
import { CATEGORY_LABELS } from "./habits";
import type { CatchUpDraft } from "@/lib/goal-catchup";
import type { ExpenseCategory } from "./expense-types";
import type { DataStore } from "./store";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface SpendingContext {
  totalCents: number;
  topLabel: string | null;
}

export async function recentSpending(store: DataStore, userId: string): Promise<SpendingContext> {
  const from = formatDateInputValue(addCalendarDays(startOfToday(), -30));
  const [expenses, statements] = await Promise.all([
    store.listExpenses(userId),
    store.listStatementTransactions(userId),
  ]);
  const totals = new Map<ExpenseCategory, number>();
  let totalCents = 0;
  for (const row of [...expenses, ...statements]) {
    if (row.purchaseDate < from) {
      continue;
    }
    totalCents += row.amountCents;
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.amountCents);
  }
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    totalCents,
    topLabel: top ? CATEGORY_LABELS[top[0]] : null,
  };
}

export async function wordCatchUp(
  goalName: string,
  drafts: CatchUpDraft[],
  spending: SpendingContext,
): Promise<{ drafts: CatchUpDraft[]; source: "ai" | "fallback" }> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || drafts.length === 0) {
    return { drafts, source: "fallback" };
  }
  const spendLine =
    spending.totalCents > 0
      ? `Recent spending is $${(spending.totalCents / 100).toFixed(0)} over 30 days${spending.topLabel ? `, mostly ${spending.topLabel}` : ""}.`
      : "No spending was recorded in the last 30 days.";
  const options = drafts
    .map(
      (draft) =>
        `- kind ${draft.kind}: effect "${draft.effect}". Current detail: ${draft.detail}`,
    )
    .join("\n");

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
                "You write short savings catch-up notes for a college student. Return ONLY JSON. Do not give investment, credit, tax, or professional financial advice. Do not use em dashes. Never mention being an AI model. Do not change any dollar amount or date.",
            },
            {
              role: "user",
              content: `Goal: ${goalName}
${spendLine}

Options:
${options}

Return JSON:
{"items":[{"kind":"date","title":"short title","detail":"one sentence that keeps the same amounts and dates"}]}

Include one item per option, with the same kind. The detail must not introduce a different amount or date.`,
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
        items?: Array<{ kind?: string; title?: string; detail?: string }>;
      };
      const items = parsed.items ?? [];
      const next = drafts.map((draft) => {
        const match = items.find((item) => item.kind === draft.kind);
        const title = match?.title?.replaceAll("—", ", ").trim();
        const detail = match?.detail?.replaceAll("—", ", ").trim();
        return {
          ...draft,
          title: title ? title.slice(0, 80) : draft.title,
          detail: detail ? detail.slice(0, 220) : draft.detail,
        };
      });
      return { drafts: next, source: "ai" };
    } catch {
      // Try the next model, then the calculated wording.
    }
  }
  return { drafts, source: "fallback" };
}
