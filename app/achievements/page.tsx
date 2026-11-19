"use client";

import { BackLink } from "@/components/BackLink";
import { Button } from "@/components/Button";
import { HexBadge } from "@/components/HexBadge";
import { PageFooterNav } from "@/components/PageFooterNav";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import { STREAK_BADGES, streakBadgeById } from "@/lib/badges";
import { cn } from "@/lib/cn";
import { formatDisplayDate } from "@/lib/dates";
import { BookOpen, Flag, Lock, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AchievementPayload {
  streak: {
    currentStreak: number;
    longestStreak: number;
    history: Array<{
      weekStart: string;
      increased: boolean;
      start: number;
      end: number;
    }>;
  };
  badges: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: string;
  }>;
  locked: Array<{ id: string; name: string; howToEarn: string }>;
  challenges: Array<{
    id: string;
    title: string;
    weekStart: string;
    weekEnd: string;
    result: string;
    progress: number;
    target: number;
  }>;
  totals: {
    badgesEarned: number;
    badgesAvailable: number;
    challengesCompleted: number;
    currentStreak: number;
    longestStreak: number;
  };
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function AchievementsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payload, setPayload] = useState<AchievementPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    apiRequest<AchievementPayload>("/achievements")
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

  if (loading || !user) {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading achievements...</p>
      </section>
    );
  }

  const empty =
    payload != null &&
    payload.totals.badgesEarned === 0 &&
    payload.totals.challengesCompleted === 0 &&
    payload.streak.history.length === 0;

  return (
    <section className="page-enter mx-auto max-w-6xl space-y-6 px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Progress
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Achievements</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Streaks, badges, and challenges you have already finished.
          </p>
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
            Achievements stay locked until a parent or guardian approves the account.
          </p>
          <Button href="/profile" className="mt-5" size="sm">
            Open profile
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-orange">{error}</p> : null}

      {user.status === "active" && !payload && !error ? (
        <p className="text-sm text-muted">Loading your achievements...</p>
      ) : null}

      {payload ? (
        <>
          <section className="game-panel rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
                  Savings streak
                </p>
                <p className="mt-3 font-display text-5xl leading-none text-ink">
                  {payload.totals.currentStreak}
                  <span className="ml-2 text-lg text-muted">
                    {payload.totals.currentStreak === 1 ? "week" : "weeks"}
                  </span>
                </p>
                <p className="mt-3 text-sm text-muted">
                  Longest run {weeksLabel(payload.totals.longestStreak)}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-6">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Badges
                  </dt>
                  <dd className="mt-2 font-display text-3xl text-ink">
                    {payload.totals.badgesEarned}
                    <span className="ml-1 text-base text-muted">
                      / {payload.totals.badgesAvailable}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Challenges
                  </dt>
                  <dd className="mt-2 font-display text-3xl text-ink">
                    {payload.totals.challengesCompleted}
                  </dd>
                </div>
              </dl>
            </div>
            <ul className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Streak medals">
              {STREAK_BADGES.map((medal) => {
                const earned = payload.badges.some((badge) => badge.id === medal.id);
                return (
                  <li key={medal.id} className="flex w-16 shrink-0 flex-col items-center text-center">
                    <HexBadge
                      size="md"
                      aria-label={`${medal.name}, ${earned ? "earned" : "locked"}`}
                      className={
                        earned
                          ? medal.weeks >= 12
                            ? "bg-teal text-white"
                            : medal.weeks >= 4
                              ? "bg-gold text-ink"
                              : "bg-orange text-white"
                          : "bg-cream-dark text-muted"
                      }
                    >
                      {medal.weeks}
                    </HexBadge>
                    <p className={cn("mt-1 text-[11px] font-semibold leading-tight", earned ? "text-ink" : "text-muted")}>
                      {medal.name}
                    </p>
                  </li>
                );
              })}
            </ul>
            {(() => {
              const nextMedal = STREAK_BADGES.find(
                (medal) => !payload.badges.some((badge) => badge.id === medal.id),
              );
              const next = payload.locked.find((badge) => badge.id === nextMedal?.id);
              if (!next) {
                return payload.badges.some((badge) => streakBadgeById(badge.id)) ? (
                  <p className="mt-4 text-sm text-muted">You have every streak medal.</p>
                ) : null;
              }
              return (
                <p className="mt-4 text-sm leading-6 text-muted">
                  Next medal is {next.name}. {next.howToEarn}
                </p>
              );
            })()}
            {empty ? (
              <div className="mt-6 border-t border-line pt-5">
                <h2 className="font-display text-2xl text-ink">Nothing earned yet</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Create a savings goal, join a weekly challenge, or read a lesson.
                  A streak starts when savings go up from one week to the next.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button href="/dashboard" size="sm">
                    Open quests
                  </Button>
                  <Button href="/challenges" size="sm" variant="outline">
                    See challenges
                  </Button>
                  <Button href="/lessons" size="sm" variant="outline">
                    Open a lesson
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          {payload.streak.history.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl text-ink">Weeks</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[...payload.streak.history].reverse().map((week) => (
                  <li
                    key={week.weekStart}
                    className="rounded-2xl border border-line bg-card px-3 py-3"
                  >
                    <p className="text-xs font-semibold text-muted">
                      {formatDisplayDate(week.weekStart)}
                    </p>
                    <p className={cn("mt-2 text-sm font-semibold", week.increased ? "text-teal" : "text-muted")}>
                      {week.increased ? "Up" : "Not up"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {MONEY.format(week.end)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {payload.badges.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl text-ink">Earned</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {payload.badges.map((badge) => (
                  <li key={badge.id} className="game-panel flex items-start gap-3 rounded-3xl px-4 py-4">
                    <BadgeMark id={badge.id} earned />
                    <div>
                      <p className="font-semibold text-ink">{badge.name}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{badge.description}</p>
                      <p className="mt-2 text-xs font-semibold text-teal">
                        {formatDisplayDate(badge.earnedAt.slice(0, 10))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {payload.locked.filter((badge) => !streakBadgeById(badge.id)).length > 0 ? (
            <section>
              <h2 className="font-display text-2xl text-ink">Still to earn</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {payload.locked
                  .filter((badge) => !streakBadgeById(badge.id))
                  .map((badge) => (
                    <li key={badge.id} className="flex items-start gap-3 rounded-3xl border border-dashed border-line px-4 py-4">
                      <BadgeMark id={badge.id} earned={false} />
                      <div>
                        <p className="font-semibold text-ink">{badge.name}</p>
                        <p className="mt-1 text-sm leading-6 text-muted">{badge.howToEarn}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          {payload.challenges.length > 0 ? (
            <section className="game-panel overflow-hidden rounded-3xl">
              <div className="border-b border-line px-6 py-4">
                <h2 className="font-display text-2xl text-ink">Finished challenges</h2>
              </div>
              <ul className="divide-y divide-line">
                {payload.challenges.map((challenge) => (
                  <li key={challenge.id} className="flex items-center justify-between gap-3 px-6 py-4">
                    <div>
                      <p className="font-semibold text-ink">{challenge.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {formatDisplayDate(challenge.weekStart)} to {formatDisplayDate(challenge.weekEnd)}
                      </p>
                    </div>
                    <p className="text-right text-sm font-semibold text-teal">
                      {MONEY.format(challenge.progress)}
                      <span className="mt-1 block text-xs font-medium text-muted">
                        of {MONEY.format(challenge.target)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <PageFooterNav />
    </section>
  );
}

function weeksLabel(count: number) {
  return `${count} ${count === 1 ? "week" : "weeks"}`;
}

function BadgeMark({ id, earned }: { id: string; earned: boolean }) {
  const medal = streakBadgeById(id);
  if (medal) {
    return (
      <HexBadge
        size="sm"
        aria-hidden="true"
        className={earned ? "bg-teal text-white" : "bg-cream-dark text-muted"}
      >
        {medal.weeks}
      </HexBadge>
    );
  }
  const Icon = id === "first-lesson" ? BookOpen : id.startsWith("save") ? Flag : Trophy;
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        earned ? "bg-teal/10 text-teal" : "bg-cream-dark text-muted"
      }`}
    >
      <Icon size={16} aria-hidden="true" />
    </span>
  );
}
