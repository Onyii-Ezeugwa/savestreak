"use client";

import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { CATEGORY_LABELS } from "@/lib/backend/habits";
import type { ExpenseCategory } from "@/lib/backend/expense-types";
import { CATEGORY_STYLE } from "@/lib/category-style";
import type { ApiErrorPayload } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDisplayDate } from "@/lib/dates";
import { compressReceiptImage } from "@/lib/scan-receipt-browser";
import { Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { PageFooterNav } from "@/components/PageFooterNav";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

interface ExpenseView {
  id: string;
  merchant: string;
  purchaseDate: string;
  amount: number;
  category: string;
  receiptUrl: string | null;
  createdAt: string;
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default function ExpensesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseView[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.status === "active") {
      void loadExpenses();
    }
  }, [user]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  async function loadExpenses() {
    try {
      const response = await fetch("/api/expenses", { credentials: "include" });
      const payload = (await response.json()) as {
        expenses?: ExpenseView[];
        error?: string;
      };
      if (!response.ok) {
        throw { error: payload.error || "Could not load expenses." };
      }
      setExpenses(payload.expenses ?? []);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a receipt photo first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setScanStatus("Preparing photo...");
    setScanProgress(0);
    try {
      const compressed = await compressReceiptImage(file);
      setScanStatus("Reading receipt...");
      setScanProgress(35);

      const today = new Date();
      const uploadedOn = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      const body = new FormData();
      body.set("receipt", compressed);
      body.set("uploadedOn", uploadedOn);
      const response = await fetch("/api/expenses", {
        method: "POST",
        body,
        credentials: "include",
      });
      setScanProgress(85);
      const payload = (await response.json()) as {
        error?: string;
        expense?: ExpenseView;
      };
      if (!response.ok) {
        throw { error: payload.error || "Could not read that receipt." };
      }
      setFile(null);
      setScanStatus(null);
      setScanProgress(0);
      setMessage(
        `Saved ${payload.expense?.merchant ?? "expense"} for ${MONEY.format(payload.expense?.amount ?? 0)}.`,
      );
      await loadExpenses();
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
      setScanStatus(null);
      setScanProgress(0);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading expenses...</p>
      </section>
    );
  }

  if (user.status !== "active") {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4">
          <BackLink />
          <div className="rounded-3xl border border-gold/40 bg-gold/10 p-6">
            <h1 className="font-display text-3xl text-ink">Receipts locked</h1>
            <p className="mt-3 text-sm text-muted">
              Finish account approval before capturing expenses.
            </p>
          </div>
        </div>
        <PageFooterNav />
      </section>
    );
  }

  return (
    <section className="page-enter mx-auto max-w-6xl space-y-8 px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Spending
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Capture a receipt
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Photograph or upload a receipt. $aveStreak reads the merchant and
            total, then saves the expense on today's date.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <form onSubmit={onSubmit} className="game-panel space-y-4 rounded-3xl p-5">
          <div>
            <h2 className="font-display text-2xl text-ink">New receipt</h2>
            <p className="mt-1 text-sm text-muted">A photo of the paper receipt.</p>
          </div>
          <label
            htmlFor="receipt"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-cream px-4 py-3 text-sm"
          >
            <span className="min-w-0 truncate font-medium text-ink">
              {file ? file.name : "Choose a photo"}
            </span>
            <span className="shrink-0 rounded-full bg-teal px-3 py-1 text-xs font-semibold text-white">
              Browse
            </span>
          </label>
          <input
            id="receipt"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-64 w-full object-contain"
              />
            </div>
          ) : null}

          {submitting && scanStatus ? (
            <div
              className="rounded-2xl border border-teal/20 bg-teal/5 px-4 py-3"
              role="status"
              aria-live="polite"
            >
              <p className="inline-flex items-center gap-2 text-sm font-medium text-teal">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                {scanStatus}
              </p>
              {scanProgress > 0 && scanProgress < 100 ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal/15">
                  <div
                    className="h-full bg-teal transition-[width] duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-orange">{error}</p> : null}
          {message ? <p className="text-sm text-teal">{message}</p> : null}
          <Button type="submit" disabled={submitting || !file} className="w-full">
            {submitting ? "Processing..." : "Scan and save"}
          </Button>
        </form>

        <div className="game-panel overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="font-display text-2xl text-ink">Your receipts</h2>
            <p className="text-sm text-muted">
              {expenses.length} saved
              {expenses.length > 0
                ? ` · ${MONEY.format(expenses.reduce((sum, expense) => sum + expense.amount, 0))}`
                : ""}
            </p>
          </div>
          {expenses.length === 0 ? (
            <p className="px-5 py-8 text-sm leading-6 text-muted">
              Photograph a receipt. The merchant, total, and category show up here.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {expenses.map((expense) => {
                const known = expense.category in CATEGORY_STYLE;
                const style = known
                  ? CATEGORY_STYLE[expense.category as ExpenseCategory]
                  : CATEGORY_STYLE.other;
                const label = known
                  ? CATEGORY_LABELS[expense.category as ExpenseCategory]
                  : expense.category;
                return (
                  <li key={expense.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn("h-2.5 w-2.5 shrink-0 rounded-full", style.dot)}
                            aria-hidden="true"
                          />
                          <h3 className="truncate font-semibold text-ink">{expense.merchant}</h3>
                        </div>
                        <p className="mt-1 pl-4 text-sm text-muted">
                          {formatDisplayDate(expense.purchaseDate)}
                          <span
                            className={cn(
                              "ml-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                              style.chip,
                            )}
                          >
                            {label}
                          </span>
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold text-ink">
                        {MONEY.format(expense.amount)}
                      </p>
                    </div>
                    {expense.receiptUrl ? (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block overflow-hidden rounded-2xl border border-line"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={expense.receiptUrl}
                          alt={`Receipt for ${expense.merchant}`}
                          className="max-h-40 w-full max-w-xs object-contain bg-cream"
                        />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <PageFooterNav />
    </section>
  );
}
