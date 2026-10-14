"use client";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { GoalDatePicker } from "@/components/GoalDatePicker";
import { useAuth } from "@/components/AuthProvider";
import {
  apiRequest,
  type AccountGoal,
  type ApiErrorPayload,
} from "@/lib/api";
import { formatDisplayDate } from "@/lib/dates";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const [draftPlans, setDraftPlans] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [planningGoalId, setPlanningGoalId] = useState<string | null>(null);
  const [savingPlanGoalId, setSavingPlanGoalId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

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
    void (async () => {
      const worth = await refreshGoals();
      if (!worth?.lastRefreshedAt) {
        return;
      }
      const ageMs = Date.now() - new Date(worth.lastRefreshedAt).getTime();
      if (ageMs > 24 * 60 * 60 * 1000) {
        await refreshBankBalances(false);
      }
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading your player HUD...</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Player HUD
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Welcome, {user.firstName}
          </h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/connect-bank" variant="outline">
            Connect bank
          </Button>
          <Button href="/expenses" variant="outline">
            Receipts
          </Button>
          <Button type="button" variant="secondary" onClick={() => {
            void logout().then(() => router.push("/"));
          }}>
            Log out
          </Button>
        </div>
      </div>

      {user.status === "pending_consent" ? (
        <div className="mt-8 rounded-3xl border border-gold/40 bg-gold/10 p-6">
          <h2 className="font-display text-2xl text-ink">
            Waiting on parent or guardian approval
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Your account is created, but savings goals stay locked until a
            parent or guardian approves the consent request.
          </p>
        </div>
      ) : null}

      {user.status === "restricted" ? (
        <div className="mt-8 rounded-3xl border border-orange/30 bg-orange/8 p-6">
          <h2 className="font-display text-2xl text-ink">Account restricted</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            A parent or guardian declined consent, so this account cannot
            create or manage savings goals.
          </p>
        </div>
      ) : null}

      {user.status === "active" ? (
        <div className="mt-8 space-y-6">
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

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <h2 className="font-display text-2xl text-ink">Your quests</h2>
            {loadError ? (
              <p className="text-sm text-orange">{loadError}</p>
            ) : null}
            {goals.length === 0 && !loadError ? (
              <p className="text-sm text-muted">
                No savings goals yet. Create one to start tracking progress.
              </p>
            ) : null}
            {goals.map((goal) => (
              <article key={goal.id} className="game-panel rounded-3xl p-5">
                {editingId === goal.id ? (
                  <GoalForm
                    initial={goal}
                    bankAccounts={bankAccounts}
                    submitLabel="Save changes"
                    onCancel={() => setEditingId(null)}
                    onSaved={async () => {
                      setEditingId(null);
                      await refreshGoals();
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-2xl text-ink">
                            {goal.name}
                          </h3>
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
                          {goal.linkedAccountId
                            ? " · Progress uses linked account balance"
                            : null}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-teal">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-sm border border-teal/20 bg-cream-dark">
                      <div
                        className={`h-full transition-[width] duration-500 ${
                          goal.completed ? "bg-green" : "bg-teal"
                        }`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(goal.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          planningGoalId !== null || savingPlanGoalId !== null
                        }
                        aria-busy={planningGoalId === goal.id}
                        onClick={async () => {
                          setPlanningGoalId(goal.id);
                          setLoadError(null);
                          try {
                            const payload = await apiRequest<{
                              plan: Record<string, unknown>;
                            }>(`/goals/${goal.id}/plan`, {
                              method: "POST",
                              body: JSON.stringify({}),
                            });
                            setDraftPlans((current) => ({
                              ...current,
                              [goal.id]: payload.plan,
                            }));
                          } catch (caught) {
                            setLoadError((caught as ApiErrorPayload).error);
                          } finally {
                            setPlanningGoalId(null);
                          }
                        }}
                      >
                        {planningGoalId === goal.id ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2
                              size={14}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                            Generating plan...
                          </span>
                        ) : goal.savedPlan ? (
                          "Regenerate AI plan"
                        ) : (
                          "Get AI plan"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await apiRequest(`/goals/${goal.id}`, {
                            method: "DELETE",
                          });
                          await refreshGoals();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                    {planningGoalId === goal.id ? (
                      <div
                        className="mt-4 rounded-2xl border border-teal/25 bg-teal/5 px-4 py-4"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal">
                          <Loader2
                            size={16}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                          Building your AI plan
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Looking at {goal.name}, your timeline, and any linked
                          balances. This usually takes a few seconds.
                        </p>
                      </div>
                    ) : (draftPlans[goal.id] || goal.savedPlan) ? (
                      <div className="mt-4 rounded-2xl border border-line bg-cream px-4 py-3 text-sm">
                        <p className="font-semibold text-ink">
                          {draftPlans[goal.id] ? "New AI plan" : "Saved AI plan"}
                        </p>
                        <p className="mt-2 leading-6 text-muted">
                          {String(
                            (draftPlans[goal.id] ?? goal.savedPlan)?.summary ??
                              "",
                          )}
                        </p>
                        <p className="mt-2 text-ink">
                          Save about{" "}
                          {MONEY.format(
                            Number(
                              (draftPlans[goal.id] ?? goal.savedPlan)
                                ?.cadenceAmount ?? 0,
                            ),
                          )}{" "}
                          per{" "}
                          {String(
                            (draftPlans[goal.id] ?? goal.savedPlan)
                              ?.cadenceFrequency ?? "week",
                          )}
                          .
                        </p>
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
                          {(
                            ((draftPlans[goal.id] ?? goal.savedPlan)
                              ?.suggestions as string[] | undefined) ?? []
                          )
                            .slice(0, 4)
                            .map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                        </ul>
                        {!(
                          (draftPlans[goal.id] ?? goal.savedPlan)
                            ?.usedFinancialData
                        ) ? (
                          <p className="mt-3 text-xs text-muted">
                            Built from the goal details only. Connect a bank for
                            a more personalized plan.
                          </p>
                        ) : null}
                        {draftPlans[goal.id] ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3"
                            disabled={
                              savingPlanGoalId === goal.id ||
                              planningGoalId !== null
                            }
                            aria-busy={savingPlanGoalId === goal.id}
                            onClick={async () => {
                              setSavingPlanGoalId(goal.id);
                              try {
                                await apiRequest(`/goals/${goal.id}/plan`, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    action: "save",
                                    plan: draftPlans[goal.id],
                                  }),
                                });
                                setDraftPlans((current) => {
                                  const next = { ...current };
                                  delete next[goal.id];
                                  return next;
                                });
                                await refreshGoals();
                              } finally {
                                setSavingPlanGoalId(null);
                              }
                            }}
                          >
                            {savingPlanGoalId === goal.id ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                  aria-hidden="true"
                                />
                                Saving...
                              </span>
                            ) : (
                              "Save plan to goal"
                            )}
                          </Button>
                        ) : goal.savedPlanAt ? (
                          <p className="mt-3 text-xs text-muted">
                            Saved {new Date(goal.savedPlanAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            ))}
          </div>
          <aside className="game-panel h-fit rounded-3xl p-5">
            <h2 className="font-display text-2xl text-ink">New goal</h2>
            <p className="mt-1 text-sm text-muted">
              Name it, set a target, and pick a date that has not passed.
            </p>
            <div className="mt-4">
              <GoalForm
                bankAccounts={bankAccounts}
                submitLabel="Create goal"
                onSaved={async () => {
                  await refreshGoals();
                }}
              />
            </div>
          </aside>
        </div>
        </div>
      ) : null}
    </section>
  );
}

function GoalForm({
  initial,
  bankAccounts = [],
  submitLabel,
  onSaved,
  onCancel,
}: {
  initial?: AccountGoal;
  bankAccounts?: Array<{
    id: string;
    name: string;
    accountType: string;
    balance: number;
  }>;
  submitLabel: string;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}) {
  const linkableAccounts = bankAccounts.filter(
    (account) =>
      account.accountType === "savings" || account.accountType === "checking",
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    initial ? String(initial.targetAmount) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(
    initial ? String(initial.currentAmount) : "0",
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [linkedAccountId, setLinkedAccountId] = useState(
    initial?.linkedAccountId ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const body = {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        targetDate,
        ...(initial
          ? { linkedAccountId: linkedAccountId || null }
          : {}),
      };
      if (initial) {
        await apiRequest(`/goals/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest("/goals", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setName("");
        setTargetAmount("");
        setCurrentAmount("0");
        setTargetDate("");
        setLinkedAccountId("");
      }
      await onSaved();
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setError(payload.error);
      setFieldErrors(payload.fieldErrors ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Goal name"
        value={name}
        error={fieldErrors.name}
        onChange={(event) => setName(event.target.value)}
      />
      <Field
        label="Target amount"
        type="number"
        min="1"
        step="1"
        value={targetAmount}
        error={fieldErrors.targetAmount}
        onChange={(event) => setTargetAmount(event.target.value)}
      />
      <Field
        label="Saved so far"
        type="number"
        min="0"
        step="1"
        value={currentAmount}
        error={fieldErrors.currentAmount}
        onChange={(event) => setCurrentAmount(event.target.value)}
        hint={
          linkedAccountId
            ? "Linked account balance overrides this when you save."
            : undefined
        }
      />
      {initial && linkableAccounts.length > 0 ? (
        <div>
          <label
            htmlFor={`linked-account-${initial.id}`}
            className="text-sm font-medium text-ink"
          >
            Linked savings account
          </label>
          <select
            id={`linked-account-${initial.id}`}
            className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm text-ink"
            value={linkedAccountId}
            onChange={(event) => setLinkedAccountId(event.target.value)}
          >
            <option value="">None (manual progress)</option>
            {linkableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({MONEY.format(account.balance)})
              </option>
            ))}
          </select>
          {fieldErrors.linkedAccountId ? (
            <p className="mt-2 text-sm text-orange">
              {fieldErrors.linkedAccountId}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              When linked, progress uses that account balance.
            </p>
          )}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium text-ink">Target date</p>
        <div className="mt-2">
          <GoalDatePicker
            id={initial ? `edit-date-${initial.id}` : "new-goal-date"}
            value={targetDate}
            onChange={setTargetDate}
            error={fieldErrors.targetDate}
          />
        </div>
        {fieldErrors.targetDate ? (
          <p className="mt-2 text-sm text-orange">{fieldErrors.targetDate}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-orange">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
