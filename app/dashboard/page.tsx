"use client";

import { Button } from "@/components/Button";
import { GoalForm } from "@/components/GoalForm";
import { HabitsPanel } from "@/components/HabitsPanel";
import { useAuth } from "@/components/AuthProvider";
import {
  apiRequest,
  type AccountGoal,
  type ApiErrorPayload,
} from "@/lib/api";
import { formatDisplayDate } from "@/lib/dates";
import {
  ArrowLeftRight,
  BookOpen,
  Flag,
  Landmark,
  Loader2,
  Lock,
  Plus,
  Receipt,
  ScrollText,
  Trophy,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

const DASHBOARD_LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/connect-bank", label: "Connect bank", icon: Landmark },
  { href: "/overview", label: "Overview", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/expenses", label: "Receipts", icon: Receipt },
  { href: "/summaries", label: "Weekly summary", icon: ScrollText },
  { href: "/challenges", label: "Challenges", icon: Flag },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/lessons", label: "Lesson", icon: BookOpen },
];

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function PaceBadge({ pace }: { pace: AccountGoal["pace"] }) {
  const styles =
    pace === "complete"
      ? "border-green/30 bg-green/10 text-green"
      : pace === "on_track"
        ? "border-teal/30 bg-teal/10 text-teal"
        : "border-orange/30 bg-orange/10 text-orange";
  const label =
    pace === "complete"
      ? "Complete"
      : pace === "on_track"
        ? "On track"
        : "Behind";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<AccountGoal[]>([]);
  const [bankAccounts, setBankAccounts] = useState<
    Array<{ id: string; name: string; accountType: string; balance: number }>
  >([]);
  const [netWorth, setNetWorth] = useState<{
    assets: number;
    debts: number;
    netWorth: number;
    lastRefreshedAt: string | null;
  } | null>(null);
  const [bankMessage, setBankMessage] = useState<string | null>(null);
  const [refreshingBanks, setRefreshingBanks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const goalDialogTitle = useId();
  const [habitTick, setHabitTick] = useState(0);
  const [habitSnapshot, setHabitSnapshot] = useState<{
    streak: {
      currentStreak: number;
      longestStreak: number;
      history: Array<{ weekStart: string; increased: boolean }>;
    };
    badges: Array<{ id: string; name: string; description: string; earnedAt: string }>;
    justEarned: Array<{ id: string; name: string; description: string; earnedAt: string }>;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!creatingGoal) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCreatingGoal(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [creatingGoal]);

  async function refreshGoals() {
    try {
      const [goalPayload, bankPayload] = await Promise.all([
        apiRequest<{ goals: AccountGoal[] }>("/goals"),
        apiRequest<{
          connections: Array<{
            accounts: Array<{
              id: string;
              name: string;
              accountType: string;
              balance: number;
            }>;
          }>;
          netWorth: {
            assets: number;
            debts: number;
            netWorth: number;
            lastRefreshedAt: string | null;
          };
        }>("/bank-connections").catch(() => ({
          connections: [],
          netWorth: null,
        })),
      ]);
      setGoals(goalPayload.goals);
      setBankAccounts(
        bankPayload.connections.flatMap((connection) => connection.accounts),
      );
      setNetWorth(bankPayload.netWorth);
      setLoadError(null);
      setHabitTick((current) => current + 1);
      return bankPayload.netWorth;
    } catch (caught) {
      setLoadError((caught as ApiErrorPayload).error);
      return null;
    }
  }

  async function refreshBankBalances(manual = false) {
    setRefreshingBanks(true);
    setBankMessage(null);
    try {
      const payload = await apiRequest<{
        netWorth: {
          assets: number;
          debts: number;
          netWorth: number;
          lastRefreshedAt: string | null;
        };
      }>("/bank-connections/refresh", { method: "POST" });
      setNetWorth(payload.netWorth);
      await refreshGoals();
      if (manual) {
        setBankMessage("Balances refreshed.");
      }
    } catch (caught) {
      setBankMessage((caught as ApiErrorPayload).error);
      await refreshGoals();
    } finally {
      setRefreshingBanks(false);
    }
  }

  useEffect(() => {
    if (user?.status !== "active") {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const payload = await apiRequest<{
          goals: AccountGoal[];
          connections: Array<{
            accounts: Array<{
              id: string;
              name: string;
              accountType: string;
              balance: number;
            }>;
          }>;
          netWorth: {
            assets: number;
            debts: number;
            netWorth: number;
            lastRefreshedAt: string | null;
          };
          streak: {
            currentStreak: number;
            longestStreak: number;
            history: Array<{ weekStart: string; increased: boolean }>;
          };
          badges: {
            badges: Array<{ id: string; name: string; description: string; earnedAt: string }>;
            justEarned: Array<{ id: string; name: string; description: string; earnedAt: string }>;
          };
        }>("/dashboard");
        if (cancelled) {
          return;
        }
        setGoals(payload.goals);
        setBankAccounts(payload.connections.flatMap((connection) => connection.accounts));
        setNetWorth(payload.netWorth);
        setHabitSnapshot({
          streak: payload.streak,
          badges: payload.badges.badges ?? [],
          justEarned: payload.badges.justEarned ?? [],
        });
        setLoadError(null);
        const refreshedAt = payload.netWorth?.lastRefreshedAt;
        if (!refreshedAt) {
          return;
        }
        const ageMs = Date.now() - new Date(refreshedAt).getTime();
        if (Number.isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
          void refreshBankBalances(false);
        }
      } catch (caught) {
        if (!cancelled) {
          setLoadError((caught as ApiErrorPayload).error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading your player HUD...</p>
      </section>
    );
  }

  return (
    <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Player HUD
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Welcome, {user.firstName}
          </h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => {
            void logout().then(() => router.push("/"));
          }}
        >
          Log out
        </Button>
      </div>
      <nav
        aria-label="Dashboard"
        className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {DASHBOARD_LINKS.map((item) =>
          user.status === "active" ? (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-2xl border border-line bg-card px-3.5 py-3 text-sm font-semibold leading-tight text-ink transition duration-200 hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
            >
              <item.icon size={16} className="shrink-0 text-teal" aria-hidden="true" />
              {item.label}
            </Link>
          ) : (
            <div
              key={item.href}
              className="flex items-center gap-2.5 rounded-2xl border border-line bg-cream px-3.5 py-3 text-sm font-semibold leading-tight text-muted"
              aria-disabled="true"
            >
              <Lock size={16} className="shrink-0" aria-hidden="true" />
              {item.label} locked
            </div>
          ),
        )}
      </nav>

      {user.status === "pending_consent" ? (
        <div className="mt-8 rounded-3xl border border-gold/40 bg-gold/10 p-6">
          <h2 className="font-display text-2xl text-ink">
            Waiting on parent or guardian approval
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Your account is created, but savings goals stay locked until a
            parent or guardian approves the consent request.
          </p>
          <Button href="/profile" className="mt-4" size="sm">
            Open profile
          </Button>
        </div>
      ) : null}

      {user.status === "restricted" ? (
        <div className="mt-8 rounded-3xl border border-orange/30 bg-orange/8 p-6">
          <h2 className="font-display text-2xl text-ink">Account restricted</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            A parent or guardian declined consent, so this account cannot
            create or manage savings goals.
          </p>
          <Button href="/profile" className="mt-4" size="sm" variant="secondary">
            Open profile
          </Button>
        </div>
      ) : null}

      {user.status === "active" ? (
        <div className="mt-8 space-y-6">
          <HabitsPanel tick={habitTick} snapshot={habitSnapshot} />
          {bankAccounts.length > 0 && netWorth ? (
            <div className="game-panel rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl text-ink">Balances</h2>
                  <p className="mt-1 text-sm text-muted">
                    Last updated{" "}
                    {netWorth.lastRefreshedAt
                      ? new Date(netWorth.lastRefreshedAt).toLocaleString()
                      : "never"}
                    . Auto-refreshes once a day.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={refreshingBanks}
                  onClick={() => void refreshBankBalances(true)}
                >
                  {refreshingBanks ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Refreshing...
                    </span>
                  ) : (
                    "Refresh balances"
                  )}
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Assets
                  </p>
                  <p className="mt-1 font-display text-2xl text-ink">
                    {MONEY.format(netWorth.assets)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Debts
                  </p>
                  <p className="mt-1 font-display text-2xl text-ink">
                    {MONEY.format(netWorth.debts)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Net worth
                  </p>
                  <p className="mt-1 font-display text-2xl text-ink">
                    {MONEY.format(netWorth.netWorth)}
                  </p>
                </div>
              </div>
              {bankMessage ? (
                <p className="mt-3 text-sm text-orange">{bankMessage}</p>
              ) : null}
            </div>
          ) : null}

        <div className="stagger-in space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl text-ink">Your quests</h2>
              <Button
                type="button"
                size="sm"
                onClick={() => setCreatingGoal(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus size={14} aria-hidden="true" />
                  New goal
                </span>
              </Button>
            </div>
            {creatingGoal
              ? createPortal(
                  <div
                    className="dialog-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
                    role="presentation"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setCreatingGoal(false);
                      }
                    }}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby={goalDialogTitle}
                      className="dialog-panel game-panel max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 shadow-[0_24px_80px_rgba(35,31,27,0.28)] sm:rounded-3xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2
                            id={goalDialogTitle}
                            className="font-display text-3xl text-ink"
                          >
                            New goal
                          </h2>
                          <p className="mt-1 text-sm text-muted">
                            Name it, set a target, and pick a date that has not
                            passed.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full p-2 text-ink hover:bg-cream-dark"
                          aria-label="Close"
                          onClick={() => setCreatingGoal(false)}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="mt-4">
                        <GoalForm
                          bankAccounts={bankAccounts}
                          submitLabel="Create goal"
                          onCancel={() => setCreatingGoal(false)}
                          onSaved={async () => {
                            setCreatingGoal(false);
                            await refreshGoals();
                          }}
                        />
                      </div>
                    </div>
                  </div>,
                  document.body,
                )
              : null}
            {loadError ? (
              <p className="text-sm text-orange">{loadError}</p>
            ) : null}
            {goals.length === 0 && !loadError ? (
              <p className="text-sm text-muted">
                No savings goals yet. Create one to start tracking progress.
              </p>
            ) : null}
            {goals.map((goal) => (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                className="game-panel block rounded-3xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-teal/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl text-ink">{goal.name}</h3>
                      <PaceBadge pace={goal.pace} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {MONEY.format(goal.currentAmount)} saved of{" "}
                      {MONEY.format(goal.targetAmount)} by{" "}
                      {formatDisplayDate(goal.targetDate)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {goal.completed
                        ? "Target reached."
                        : `${MONEY.format(goal.remainingAmount)} remaining`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-teal">
                    {goal.progress}%
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-sm border border-teal/20 bg-cream-dark">
                  <div
                    className={`h-full ${goal.completed ? "bg-green" : "bg-teal"}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-teal">Open quest</p>
              </Link>
            ))}
        </div>
        </div>
      ) : null}
    </section>
  );
}
