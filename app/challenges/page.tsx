"use client";

import { BackLink } from "@/components/BackLink";
import { Button } from "@/components/Button";
import { PageFooterNav } from "@/components/PageFooterNav";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDisplayDate } from "@/lib/dates";
import { Lock, PiggyBank, ShoppingBag, Ticket, Utensils, Bus, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ChallengeCard {
  id: string;
  title: string;
  detail: string;
  kind: "save" | "spend_under";
  target: number;
  weekStart: string;
  weekEnd: string;
  joined: boolean;
  status: "open" | "active" | "completed" | "missed";
  progress: number;
  measured: boolean;
  completed: boolean;
}

interface ChallengeHistory {
  id: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  status: "completed" | "missed";
  progress: number;
  target: number;
  measured: boolean;
}

interface ChallengePayload {
  weekStart: string;
  weekEnd: string;
  challenges: ChallengeCard[];
  history: ChallengeHistory[];
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function ChallengesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payload, setPayload] = useState<ChallengePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || user.status !== "active") {
      return;
    }
    let active = true;
    apiRequest<ChallengePayload>("/challenges")
      .then((next) => {
        if (active) {
          setPayload(next);
        }
      })
      .catch((caught: ApiErrorPayload) => {
        if (active) {
          setError(caught.error);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function join(challengeId: string) {
    setJoining(challengeId);
    setError(null);
    try {
      const next = await apiRequest<ChallengePayload>("/challenges", {
        method: "POST",
        body: JSON.stringify({ challengeId }),
      });
      setPayload(next);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    } finally {
      setJoining(null);
    }
  }

  if (loading || !user) {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading challenges...</p>
      </section>
    );
  }

  const joinedCount = payload?.challenges.filter((challenge) => challenge.joined).length ?? 0;

  return (
    <section className="page-enter mx-auto max-w-6xl space-y-6 px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            This week
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Challenges</h1>
        </div>
      </div>

      {user.status !== "active" ? (
        <div className="game-panel rounded-3xl p-8">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            <Lock size={14} aria-hidden="true" />
            Locked
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink">Waiting on approval</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Challenges stay locked until a parent or guardian approves the account.
          </p>
          <Button href="/profile" className="mt-5" size="sm">
            Open profile
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-orange">{error}</p> : null}

      {payload ? (
        <>
          <section className="game-panel rounded-3xl p-6 sm:p-8">
            <p className="font-display text-4xl text-ink">
              {formatDisplayDate(payload.weekStart)}
              <span className="mx-2 text-2xl text-muted">to</span>
              {formatDisplayDate(payload.weekEnd)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {joinedCount} of {payload.challenges.length} joined. Progress comes
              from your spending and savings balance, and each one is scored
              when the week ends.
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {payload.challenges.map((challenge) => {
              const ratio =
                challenge.target > 0
                  ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100))
                  : 0;
              const over =
                challenge.kind === "spend_under" && challenge.progress > challenge.target;
              const Icon = challengeIcon(challenge.id);
              return (
                <article key={challenge.id} className="game-panel flex flex-col rounded-3xl p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
                        challenge.kind === "save"
                          ? "bg-teal/10 text-teal"
                          : "bg-berry/10 text-berry",
                      )}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        chipClass(challenge, over),
                      )}
                    >
                      {statusLabel(challenge, over)}
                    </span>
                  </div>
                  <h2 className="mt-4 font-display text-2xl leading-tight text-ink">
                    {challenge.title}
                  </h2>
                  <p className="mt-3 font-display text-4xl leading-none text-ink">
                    {MONEY.format(challenge.target)}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    {challenge.kind === "save" ? "Amount to save" : "Spending limit"}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted">{challenge.detail}</p>
                  {challenge.joined ? (
                    <div className="mt-5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold text-ink">
                          {challenge.kind === "save" ? "Saved" : "Spent"}
                        </span>
                        <span className="text-muted">
                          {MONEY.format(challenge.progress)}
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream-dark">
                        <div
                          className={cn("h-full rounded-full", over ? "bg-berry" : "bg-teal")}
                          style={{
                            width: `${
                              challenge.measured
                                ? Math.max(ratio, challenge.progress > 0 ? 8 : 0)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      {!challenge.measured ? (
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {waitingCopy(challenge)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-5"
                      disabled={joining !== null}
                      onClick={() => void join(challenge.id)}
                    >
                      {joining === challenge.id ? "Joining..." : "Join"}
                    </Button>
                  )}
                </article>
              );
            })}
          </div>

          <section className="game-panel overflow-hidden rounded-3xl">
            <div className="flex items-end justify-between gap-3 border-b border-line px-6 py-4">
              <h2 className="font-display text-2xl text-ink">Earlier weeks</h2>
              <p className="text-sm text-muted">
                {payload.history.filter((item) => item.status === "completed").length} completed
              </p>
            </div>
            {payload.history.length === 0 ? (
              <p className="px-6 py-5 text-sm leading-6 text-muted">
                Finished challenges show up here after Sunday.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {payload.history.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div>
                      <p className="font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {formatDisplayDate(item.weekStart)} to {formatDisplayDate(item.weekEnd)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          item.status === "completed" ? "text-teal" : "text-muted",
                        )}
                      >
                        {item.status === "completed"
                          ? "Completed"
                          : item.measured
                            ? "Not completed"
                            : "Not enough records"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {MONEY.format(item.progress)} of {MONEY.format(item.target)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : user.status === "active" && !error ? (
        <p className="text-sm text-muted">Loading this week...</p>
      ) : null}

      <PageFooterNav />
    </section>
  );
}

function challengeIcon(id: string): LucideIcon {
  if (id.startsWith("food")) return Utensils;
  if (id.startsWith("transport")) return Bus;
  if (id.startsWith("shopping")) return ShoppingBag;
  if (id.startsWith("entertainment")) return Ticket;
  return PiggyBank;
}

function chipClass(challenge: ChallengeCard, over: boolean) {
  if (!challenge.joined) {
    return "border-line bg-cream text-muted";
  }
  if (over) {
    return "border-berry/30 bg-berry/10 text-berry";
  }
  if (!challenge.measured) {
    return "border-line bg-cream text-muted";
  }
  return "border-teal/30 bg-teal/10 text-teal";
}

function statusLabel(challenge: ChallengeCard, over: boolean) {
  if (!challenge.joined) {
    return "Open";
  }
  if (!challenge.measured) {
    return "Waiting";
  }
  if (over) {
    return "Over the limit";
  }
  if (challenge.completed || challenge.status === "completed") {
    return challenge.status === "active" ? "On track" : "Completed";
  }
  return "In progress";
}

function waitingCopy(challenge: ChallengeCard) {
  return challenge.kind === "save"
    ? "This needs two savings readings in the week before it can be scored."
    : "This needs spending on record before a quiet week can count as under the limit.";
}
