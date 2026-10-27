"use client";

import { HexBadge } from "@/components/HexBadge";
import { STREAK_BADGES, badgeById, streakBadgeById } from "@/lib/badges";
import { cn } from "@/lib/cn";
import { BookOpen, Loader2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface StreakPayload {
  currentStreak: number;
  longestStreak: number;
  history: Array<{
    weekStart: string;
    increased: boolean;
  }>;
}

interface BadgeView {
  id: string;
  name: string;
  description: string;
  earnedAt: string;
}

function medalClass(weeks: number, earned: boolean) {
  if (!earned) {
    return "bg-cream-dark text-muted";
  }
  if (weeks >= 52) {
    return "bg-ink text-gold";
  }
  if (weeks >= 12) {
    return "bg-teal text-white";
  }
  if (weeks >= 4) {
    return "bg-gold text-ink";
  }
  return "bg-orange text-white";
}

interface HabitSnapshot {
  streak: StreakPayload;
  badges: BadgeView[];
  justEarned: BadgeView[];
}

export function HabitsPanel({
  tick,
  snapshot,
}: {
  tick: number;
  snapshot: HabitSnapshot | null;
}) {
  const [streak, setStreak] = useState<StreakPayload | null>(snapshot?.streak ?? null);
  const [badges, setBadges] = useState<BadgeView[]>(snapshot?.badges ?? []);
  const [justEarned, setJustEarned] = useState<BadgeView[]>(snapshot?.justEarned ?? []);
  const [seenSnapshot, setSeenSnapshot] = useState(snapshot);

  if (snapshot !== seenSnapshot) {
    setSeenSnapshot(snapshot);
    if (snapshot) {
      setStreak(snapshot.streak);
      setBadges(snapshot.badges);
      setJustEarned(snapshot.justEarned);
    }
  }

  useEffect(() => {
    if (tick === 0) {
      return;
    }
    let cancelled = false;
    async function load() {
      const [streakResponse, badgeResponse] = await Promise.all([
        fetch("/api/streak", { credentials: "include" }),
        fetch("/api/badges", { credentials: "include" }),
      ]);
      if (cancelled) {
        return;
      }
      if (streakResponse.ok) {
        setStreak((await streakResponse.json()) as StreakPayload);
      }
      if (badgeResponse.ok) {
        const payload = (await badgeResponse.json()) as {
          badges: BadgeView[];
          justEarned: BadgeView[];
        };
        setBadges(payload.badges ?? []);
        setJustEarned(payload.justEarned ?? []);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (!snapshot && !streak) {
    return (
      <div
        className="game-panel rounded-3xl p-5"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading your streak
        </p>
      </div>
    );
  }

  const recent = badges.slice(0, 3);
  const reached = Math.max(streak?.currentStreak ?? 0, streak?.longestStreak ?? 0);
  const earnedIds = new Set(badges.map((badge) => badge.id));
  function medalEarned(weeks: number) {
    if (reached >= weeks) {
      return true;
    }
    return STREAK_BADGES.some(
      (medal) => medal.weeks >= weeks && earnedIds.has(medal.id),
    );
  }
  const highest = [...STREAK_BADGES].reverse().find((medal) => medalEarned(medal.weeks));
  const nextMedal = STREAK_BADGES.find((medal) => !medalEarned(medal.weeks));

  return (
    <div className="space-y-4">
      <div className="game-panel rounded-3xl p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          <div className="shrink-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
              Savings streak
            </p>
            <p className="mt-1 font-display text-4xl leading-none text-ink">
              {streak?.currentStreak ?? 0}
              <span className="ml-2 text-lg text-muted">
                week{(streak?.currentStreak ?? 0) === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          {streak ? (
            <ul className="flex shrink-0 gap-1" aria-label="Streak medals">
              {STREAK_BADGES.map((medal) => {
                const earned = medalEarned(medal.weeks);
                const upcoming = nextMedal?.id === medal.id;
                return (
                  <li key={medal.id} className="flex w-16 flex-col items-center text-center">
                    <span className={cn("rounded-full p-0.5", upcoming && "bg-orange/15")}>
                      <HexBadge
                        size="md"
                        aria-label={`${medal.name}, ${medal.weeks} week${medal.weeks === 1 ? "" : "s"}, ${earned ? "earned" : "not earned yet"}`}
                        className={medalClass(medal.weeks, earned)}
                      >
                        {medal.weeks}
                      </HexBadge>
                    </span>
                    <p
                      className={cn(
                        "mt-1 text-[11px] font-semibold leading-tight",
                        earned ? "text-ink" : "text-muted",
                      )}
                    >
                      {medal.name}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="flex min-w-56 flex-1 flex-col gap-2">
            <p className="text-sm leading-6 text-muted">
              Longest {streak?.longestStreak ?? 0}. A week counts when linked
              savings go up.{" "}
              {highest
                ? `${highest.name} is your highest medal.`
                : "No streak medal yet."}
              {nextMedal
                ? ` Next is ${nextMedal.name}, ${nextMedal.weeks} weeks in a row.`
                : " You have every streak medal."}
            </p>
            {streak && streak.history.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {streak.history.slice(-4).map((week) => (
                  <li
                    key={week.weekStart}
                    className="rounded-full border border-line bg-cream px-2.5 py-1 text-xs text-muted"
                  >
                    {week.weekStart.slice(5).replace("-", "/")}{" "}
                    {week.increased ? "up" : "flat"}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="game-panel rounded-3xl p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
          Badges
        </p>
        {justEarned.length > 0 ? (
          <p className="mt-3 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
            You earned {justEarned.map((badge) => badge.name).join(", ")}.
          </p>
        ) : null}
        {recent.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-muted">
            Badges show up when you create a goal, pass halfway, finish a goal,
            build a streak, or read a lesson.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {recent.map((badge) => {
              const known = badgeById(badge.id);
              const medal = streakBadgeById(badge.id);
              const Icon = badge.id === "first-lesson" ? BookOpen : Trophy;
              return (
                <li key={badge.id} className="flex items-start gap-3">
                  {medal ? (
                    <HexBadge
                      size="sm"
                      aria-hidden="true"
                      className={medalClass(medal.weeks, true)}
                    >
                      {medal.weeks}
                    </HexBadge>
                  ) : (
                    <Icon size={18} className="mt-0.5 text-orange" aria-hidden="true" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {known?.name ?? badge.name}
                    </p>
                    <p className="text-xs text-muted">
                      {known ? `${known.description} ` : null}
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
