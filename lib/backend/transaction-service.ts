import { randomUUID } from "node:crypto";
import { requireActiveAccount } from "./goals-service";
import {
  isExpenseCategory,
  monthBounds,
  parseStatementCsv,
  weekBounds,
} from "./habits";
import { parseStatementDocument } from "./statement-parse";
import { readStatementPdf } from "./statement-pdf";
import type { ExpenseCategory } from "./expense-types";
import type { PublicTransaction } from "./habit-types";
import type { DataStore } from "./store";
import { ApiError, type UserRecord } from "./types";

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

export async function listTransactions(
  store: DataStore,
  user: UserRecord,
  query: {
    category?: string;
    source?: string;
    from?: string;
    to?: string;
    period?: string;
    today?: string;
  },
) {
  requireActiveAccount(user);
  const today =
    query.today && /^\d{4}-\d{2}-\d{2}$/.test(query.today)
      ? query.today
      : new Date().toISOString().slice(0, 10);
  const period = query.period === "week" ? "week" : "month";
  const bounds =
    query.from && query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.from) && /^\d{4}-\d{2}-\d{2}$/.test(query.to)
      ? { from: query.from, to: query.to }
      : period === "week"
        ? weekBounds(today)
        : monthBounds(today);

  const [expenses, statements] = await Promise.all([
    store.listExpenses(user.id),
    store.listStatementTransactions(user.id),
  ]);

  const all: PublicTransaction[] = [
    ...expenses.map((expense) => ({
      id: expense.id,
      merchant: expense.merchant,
      date: expense.purchaseDate,
      amount: expense.amountCents / 100,
      category: expense.category,
      source: "receipt" as const,
    })),
    ...statements.map((transaction) => ({
      id: transaction.id,
      merchant: transaction.merchant,
      date: transaction.purchaseDate,
      amount: transaction.amountCents / 100,
      category: transaction.category,
      source: "statement" as const,
    })),
  ];

  const category =
    query.category && isExpenseCategory(query.category) ? query.category : "";
  const source =
    query.source === "receipt" || query.source === "statement"
      ? query.source
      : "";

  const transactions = all
    .filter((transaction) => inRange(transaction.date, bounds.from, bounds.to))
    .filter((transaction) => (category ? transaction.category === category : true))
    .filter((transaction) => (source ? transaction.source === source : true))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const totals = new Map<ExpenseCategory, number>();
  for (const transaction of transactions) {
    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? 0) + transaction.amount,
    );
  }

  return {
    transactions,
    totals: [...totals.entries()]
      .map(([name, amount]) => ({
        category: name,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount),
    period: { from: bounds.from, to: bounds.to, label: period },
    hasAny: all.length > 0,
  };
}

function isPdfFile(file: { name: string; type: string; bytes: Buffer }) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf") ||
    file.bytes.subarray(0, 5).toString("utf8") === "%PDF-"
  );
}

export async function importStatement(
  store: DataStore,
  user: UserRecord,
  file: { name: string; type: string; bytes: Buffer },
) {
  requireActiveAccount(user);
  const pdf = isPdfFile(file);
  if (!pdf && file.bytes.length > 1_000_000) {
    throw new ApiError(400, "Keep the statement file under 1 MB.");
  }
  if (pdf && file.bytes.length > 8_000_000) {
    throw new ApiError(400, "Keep the PDF under 8 MB.");
  }

  const parsed = pdf
    ? await parseStatementDocument(await readStatementPdf(file.bytes))
    : parseStatementCsv(file.bytes.toString("utf8"));
  if (parsed.length === 0) {
    throw new ApiError(
      422,
      pdf
        ? "No purchases were found in that PDF. Deposits and payments are skipped. You can also upload a CSV with date, merchant, and amount."
        : "No transactions were found. Use a CSV with date, merchant, and amount.",
    );
  }
  const createdAt = new Date().toISOString();
  const records = parsed.map((row) => ({
    id: randomUUID(),
    userId: user.id,
    merchant: row.merchant,
    purchaseDate: row.purchaseDate,
    amountCents: row.amountCents,
    category: row.category,
    createdAt,
  }));
  await store.createStatementTransactions(records);
  return { imported: records.length };
}
