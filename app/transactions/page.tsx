"use client";

import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { CATEGORY_LABELS } from "@/lib/backend/habits";
import { CATEGORY_STYLE } from "@/lib/category-style";
import { cn } from "@/lib/cn";
import { formatDateInputValue, formatDisplayDate } from "@/lib/dates";
import type { ExpenseCategory } from "@/lib/backend/expense-types";
import { BackLink } from "@/components/BackLink";
import { PageFooterNav } from "@/components/PageFooterNav";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

interface TransactionView {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  source: "receipt" | "statement";
}

interface TransactionsPayload {
  transactions: TransactionView[];
  totals: Array<{ category: ExpenseCategory; amount: number }>;
  period: { from: string; to: string };
  hasAny: boolean;
  error?: string;
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [payload, setPayload] = useState<TransactionsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statementMessage, setStatementMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.status === "active") {
      void loadTransactions();
    }
  }, [user, period, category, source]);

  async function loadTransactions() {
    const params = new URLSearchParams({
      period,
      today: formatDateInputValue(new Date()),
    });
    if (category) {
      params.set("category", category);
    }
    if (source) {
      params.set("source", source);
    }
    const response = await fetch(`/api/transactions?${params}`, {
      credentials: "include",
    });
    const body = (await response.json()) as TransactionsPayload;
    if (!response.ok) {
      setError(body.error || "Could not load transactions.");
      return;
    }
    setError(null);
    setPayload(body);
  }

  async function onStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setUploading(true);
    setStatementMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const body = (await response.json()) as { imported?: number; error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Could not read that statement.");
      }
      setStatementMessage(`Saved ${body.imported ?? 0} transactions.`);
      event.currentTarget.reset();
      await loadTransactions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that statement.");
    } finally {
      setUploading(false);
    }
  }

  const transactions = payload?.transactions ?? [];
  const spent = transactions.reduce((sum, item) => sum + item.amount, 0);
  const maxTotal = Math.max(...(payload?.totals.map((item) => item.amount) ?? [0]), 0);
  const top = payload?.totals[0];

  return (
    <section className="page-enter mx-auto max-w-6xl space-y-8 px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Spending
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Transactions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Receipt scans and uploaded bank statements, grouped by category.
            These records stay as they were captured.
          </p>
        </div>
      </div>

      {payload && !payload.hasAny ? (
        <div className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl text-ink">Nothing captured yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Scan a receipt, or upload a PDF bank statement. A CSV with date,
            merchant, and amount also works.
          </p>
          <Button href="/expenses" className="mt-4" size="sm">
            Scan a receipt
          </Button>
        </div>
      ) : null}

      {payload?.hasAny ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="game-panel rounded-3xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Spent
            </p>
            <p className="mt-2 font-display text-3xl text-ink">{MONEY.format(spent)}</p>
            <p className="mt-1 text-sm text-muted">
              {formatDisplayDate(payload.period.from)} to{" "}
              {formatDisplayDate(payload.period.to)}
            </p>
          </div>
          <div className="game-panel rounded-3xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Transactions
            </p>
            <p className="mt-2 font-display text-3xl text-ink">{transactions.length}</p>
            <p className="mt-1 text-sm text-muted">
              {period === "week" ? "This week" : "This month"}
              {source === "receipt"
                ? ", receipts only"
                : source === "statement"
                  ? ", statements only"
                  : ""}
            </p>
          </div>
          <div className="game-panel rounded-3xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Top category
            </p>
            {top ? (
              <>
                <p className="mt-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold",
                      CATEGORY_STYLE[top.category].chip,
                    )}
                  >
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", CATEGORY_STYLE[top.category].dot)}
                      aria-hidden="true"
                    />
                    {CATEGORY_LABELS[top.category]}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted">{MONEY.format(top.amount)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Nothing in this view.</p>
            )}
          </div>
        </div>
      ) : null}

      {payload?.hasAny ? (
        <div className="game-panel space-y-4 rounded-3xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-line bg-cream p-1">
              {(
                [
                  ["week", "This week"],
                  ["month", "This month"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={period === value}
                  onClick={() => setPeriod(value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-semibold",
                    period === value ? "bg-card text-ink" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-full border border-line bg-cream p-1">
              {(
                [
                  ["", "All sources"],
                  ["receipt", "Receipts"],
                  ["statement", "Statements"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={source === value}
                  onClick={() => setSource(value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-semibold",
                    source === value ? "bg-card text-ink" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
            <button
              type="button"
              aria-pressed={category === ""}
              onClick={() => setCategory("")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold",
                category === ""
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-card text-muted",
              )}
            >
              All
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                  category === item
                    ? CATEGORY_STYLE[item].chip
                    : "border-line bg-card text-ink",
                )}
              >
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", CATEGORY_STYLE[item].dot)}
                  aria-hidden="true"
                />
                {CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          payload && payload.totals.length > 0 && "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]",
        )}
      >
        {payload && payload.totals.length > 0 ? (
          <div className="game-panel rounded-3xl p-6">
            <h2 className="font-display text-2xl text-ink">By category</h2>
            <ul className="mt-4 space-y-3">
              {payload.totals.map((item) => {
                const share = spent > 0 ? Math.round((item.amount / spent) * 100) : 0;
                return (
                  <li key={item.category}>
                    <div className="flex items-center justify-between gap-3 text-sm text-ink">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          CATEGORY_STYLE[item.category].chip,
                        )}
                      >
                        <span
                          className={cn("h-2 w-2 rounded-full", CATEGORY_STYLE[item.category].dot)}
                          aria-hidden="true"
                        />
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span>
                        {MONEY.format(item.amount)}
                        <span className="ml-2 text-muted">{share}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-cream-dark">
                      <div
                        className={cn("h-2 rounded-full", CATEGORY_STYLE[item.category].bar)}
                        style={{
                          width: `${maxTotal > 0 ? Math.max(8, (item.amount / maxTotal) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <form onSubmit={onStatement} className="game-panel space-y-4 rounded-3xl p-6">
          <h2 className="font-display text-2xl text-ink">Upload a bank statement</h2>
          <p className="text-sm leading-6 text-muted">
            Upload a PDF bank statement. Text in the file is read directly, and a
            scanned PDF is read with OCR. Purchases are saved. Deposits and
            payments are left out. A CSV still works: date, merchant, amount, and
            an optional category.
          </p>
          <input
            name="statement"
            type="file"
            accept=".pdf,application/pdf,.csv,text/csv,text/plain"
            required
            className="block w-full text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-teal file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <Button type="submit" disabled={uploading} aria-busy={uploading}>
            {uploading ? "Reading statement..." : "Save statement"}
          </Button>
          {uploading ? (
            <p className="text-sm text-muted" role="status">
              Reading the statement. A PDF can take a moment.
            </p>
          ) : null}
          {statementMessage ? (
            <p className="text-sm text-teal">{statementMessage}</p>
          ) : null}
        </form>
      </div>

      {error ? <p className="text-sm text-orange">{error}</p> : null}

      {payload?.hasAny ? (
        <div className="game-panel overflow-hidden rounded-3xl">
          <ul className="divide-y divide-line">
            {transactions.map((transaction) => {
              const style = CATEGORY_STYLE[transaction.category];
              return (
                <li
                  key={`${transaction.source}-${transaction.id}`}
                  className="flex items-start gap-3 px-4 py-3 sm:px-5"
                >
                  <span
                    className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", style.dot)}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{transaction.merchant}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDisplayDate(transaction.date)}
                      {" · "}
                      {transaction.source === "receipt" ? "Receipt" : "Bank statement"}
                    </p>
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        style.chip,
                      )}
                    >
                      {CATEGORY_LABELS[transaction.category]}
                    </span>
                  </div>
                  <p className="font-semibold text-ink">{MONEY.format(transaction.amount)}</p>
                </li>
              );
            })}
          </ul>
          {transactions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">
              No transactions match those filters.
            </p>
          ) : null}
        </div>
      ) : null}
      <PageFooterNav />
    </section>
  );
}
