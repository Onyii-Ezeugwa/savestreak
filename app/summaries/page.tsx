"use client";

import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/cn";
import { formatDateInputValue, formatDisplayDate } from "@/lib/dates";
import { Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { PageFooterNav } from "@/components/PageFooterNav";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SummaryView {
  id: string;
  weekStart: string;
  weekEnd: string;
  spending: number;
  body: string;
  tip: string;
  hadActivity: boolean;
  source: "ai" | "fallback";
  goalNote: string;
  streakNote: string;
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function SummariesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [summaries, setSummaries] = useState<SummaryView[]>([]);
  const [current, setCurrent] = useState<SummaryView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.status === "active") {
      void loadSummaries();
    }
  }, [user]);

  async function loadSummaries() {
    const response = await fetch("/api/summaries", { credentials: "include" });
    const payload = (await response.json()) as {
      summaries?: SummaryView[];
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error || "Could not load summaries.");
      return;
    }
    setSummaries(payload.summaries ?? []);
    setCurrent(payload.summaries?.[0] ?? null);
  }

  async function generate(refresh: boolean) {
    setWriting(true);
    setError(null);
    try {
      const response = await fetch("/api/summaries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today: formatDateInputValue(new Date()),
          refresh,
        }),
      });
      const payload = (await response.json()) as {
        summary?: SummaryView;
        error?: string;
      };
      if (!response.ok || !payload.summary) {
        throw new Error(payload.error || "Could not write this week's summary.");
      }
      setCurrent(payload.summary);
      await loadSummaries();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not write this week's summary.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <section className="page-enter mx-auto max-w-5xl space-y-6 px-5 py-14 sm:px-6">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            This week
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Weekly summary</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Spending, goal progress, and your savings streak for the week. Past
            summaries stay here.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={writing} aria-busy={writing} onClick={() => void generate(false)}>
          {writing ? "Writing..." : "Get this week's summary"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={writing}
          onClick={() => void generate(true)}
        >
          Refresh summary
        </Button>
      </div>

      {writing ? (
        <div
          className="rounded-3xl border border-teal/25 bg-teal/5 px-6 py-8"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Writing this week
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Adding up spending, goals, and your streak.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-orange">{error}</p> : null}

      {!current && !writing ? (
        <div className="game-panel rounded-3xl p-6">
          <h2 className="font-display text-2xl text-ink">No summary yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Ask for this week when you want a read on spending, your goal, and
            the savings streak. Weeks with no activity say so.
          </p>
        </div>
      ) : null}

      {current ? (
        <article className="game-panel rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            {formatDisplayDate(current.weekStart)} to {formatDisplayDate(current.weekEnd)}
          </p>
          <p className="mt-3 font-display text-4xl text-ink">
            {MONEY.format(current.spending)}
            <span className="ml-2 text-lg text-muted">spent</span>
          </p>
          <p className="mt-4 text-sm leading-7 text-ink">{current.body}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Goal</p>
              <p className="mt-1 text-sm leading-6 text-ink">{current.goalNote}</p>
            </div>
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Streak</p>
              <p className="mt-1 text-sm leading-6 text-ink">{current.streakNote}</p>
            </div>
          </div>
          {current.hadActivity ? (
            <div className="mt-4 rounded-2xl border border-teal/25 bg-teal/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Try this</p>
              <p className="mt-1 text-sm leading-6 text-ink">{current.tip}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">
              No spending was captured this week, so there is no tip.
            </p>
          )}
        </article>
      ) : null}

      {summaries.length > 0 ? (
        <div>
          <h2 className="font-display text-2xl text-ink">Saved weeks</h2>
          <ul className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label="Saved weeks">
            {summaries.map((summary) => {
              const selected = current?.id === summary.id;
              return (
                <li key={summary.id} className="w-56 shrink-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCurrent(summary)}
                    className={cn(
                      "game-panel h-full w-full rounded-3xl p-4 text-left",
                      selected && "border-teal",
                    )}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">
                      {formatDisplayDate(summary.weekStart)}
                    </p>
                    <p className="mt-2 font-display text-2xl text-ink">
                      {MONEY.format(summary.spending)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {summary.hadActivity ? summary.tip : "No spending this week"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <PageFooterNav />
    </section>
  );
}
