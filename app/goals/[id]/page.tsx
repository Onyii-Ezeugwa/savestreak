"use client";

import { BackLink } from "@/components/BackLink";
import { Button } from "@/components/Button";
import { CatchUpSuggestions } from "@/components/CatchUpSuggestions";
import { GoalForm } from "@/components/GoalForm";
import { PageFooterNav } from "@/components/PageFooterNav";
import { useAuth } from "@/components/AuthProvider";
import {
  apiRequest,
  type AccountGoal,
  type ApiErrorPayload,
} from "@/lib/api";
import { formatDisplayDate } from "@/lib/dates";
import { Loader2, Lock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

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
    pace === "complete" ? "Complete" : pace === "on_track" ? "On track" : "Behind";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

export default function GoalPage() {
  const params = useParams<{ id: string }>();
  const goalId = params.id;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [goal, setGoal] = useState<AccountGoal | null>(null);
  const [missing, setMissing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<
    Array<{ id: string; name: string; accountType: string; balance: number }>
  >([]);
  const [editing, setEditing] = useState(false);
  const [draftPlan, setDraftPlan] = useState<Record<string, unknown> | null>(null);
  const [planning, setPlanning] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTitle = useId();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const refresh = useCallback(async () => {
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
      }>("/bank-connections").catch(() => ({ connections: [] })),
    ]);
    const next = goalPayload.goals.find((item) => item.id === goalId) ?? null;
    setGoal(next);
    setMissing(!next);
    setBankAccounts(
      bankPayload.connections.flatMap((connection) => connection.accounts),
    );
  }, [goalId]);

  useEffect(() => {
    if (!user || user.status !== "active" || !goalId) {
      return;
    }
    let active = true;
    refresh().catch((caught: ApiErrorPayload) => {
      if (active) {
        setError(caught.error);
      }
    });
    return () => {
      active = false;
    };
  }, [user, goalId, refresh]);

  if (loading || !user) {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading quest...</p>
      </section>
    );
  }

  const plan = draftPlan ?? goal?.savedPlan ?? null;

  return (
    <section className="page-enter mx-auto max-w-6xl space-y-6 px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Quest
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            {goal?.name ?? "Quest"}
          </h1>
          {goal ? (
            <p className="mt-3 text-sm leading-6 text-muted">
              {MONEY.format(goal.targetAmount)} by {formatDisplayDate(goal.targetDate)}
            </p>
          ) : null}
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
            This quest stays locked until a parent or guardian approves the account.
          </p>
          <Button href="/profile" className="mt-5" size="sm">
            Open profile
          </Button>
        </div>
      ) : !goal && error ? (
        <p className="text-sm text-orange">{error}</p>
      ) : !goal && !missing ? (
        <p className="text-sm text-muted">Loading this quest...</p>
      ) : missing || !goal ? (
        <div className="game-panel rounded-3xl p-8">
          <h2 className="font-display text-3xl text-ink">Quest not found</h2>
          <p className="mt-2 text-sm text-muted">
            That quest is not on this account.
          </p>
          <Button href="/dashboard" className="mt-5" size="sm">
            Back to dashboard
          </Button>
        </div>
      ) : editing ? (
        <div className="game-panel rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-2xl text-ink">Edit quest</h2>
          <div className="mt-4">
            <GoalForm
              initial={goal}
              bankAccounts={bankAccounts}
              submitLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSaved={async () => {
                setEditing(false);
                setDraftPlan(null);
                await refresh();
              }}
            />
          </div>
        </div>
      ) : (
        <>
          <article className="game-panel rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <PaceBadge pace={goal.pace} />
                <p className="mt-4 font-display text-5xl leading-none text-ink">
                  {MONEY.format(goal.currentAmount)}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  saved of {MONEY.format(goal.targetAmount)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-display text-4xl leading-none text-teal">
                  {goal.progress}%
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Progress
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              </div>
            </div>
            <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-cream-dark">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  goal.completed ? "bg-green" : "bg-teal"
                }`}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Remaining
                </dt>
                <dd className="mt-2 font-display text-2xl text-ink">
                  {goal.completed ? "Done" : MONEY.format(goal.remainingAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Target date
                </dt>
                <dd className="mt-2 font-display text-2xl text-ink">
                  {formatDisplayDate(goal.targetDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Tracking
                </dt>
                <dd className="mt-2 font-display text-2xl text-ink">
                  {goal.linkedAccountId ? "Linked balance" : "Your entries"}
                </dd>
              </div>
            </dl>
          </article>

          <div className="space-y-4">
            {goal.pace === "behind" ? (
              <CatchUpSuggestions
                goalId={goal.id}
                onChanged={async () => {
                  setDraftPlan(null);
                  await refresh();
                }}
              />
            ) : null}

            <section className="game-panel rounded-3xl p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl text-ink">Savings plan</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    How much to set aside, and a few ways to stay on pace.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={planning || savingPlan}
                  aria-busy={planning}
                  onClick={async () => {
                    setPlanning(true);
                    setError(null);
                    try {
                      const payload = await apiRequest<{
                        plan: Record<string, unknown>;
                      }>(`/goals/${goal.id}/plan`, {
                        method: "POST",
                        body: JSON.stringify({}),
                      });
                      setDraftPlan(payload.plan);
                    } catch (caught) {
                      setError((caught as ApiErrorPayload).error);
                    } finally {
                      setPlanning(false);
                    }
                  }}
                >
                  {planning ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Generating...
                    </span>
                  ) : goal.savedPlan ? (
                    "Regenerate"
                  ) : (
                    "Get AI plan"
                  )}
                </Button>
              </div>
              {goal.planStale && goal.savedPlan ? (
                <p className="mt-4 text-sm text-orange">
                  This plan is out of date because the target changed. Regenerate
                  it when you are ready.
                </p>
              ) : null}
              {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
              {planning ? (
                <div
                  className="mt-5 rounded-2xl border border-teal/25 bg-teal/5 px-4 py-4"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal">
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Building your AI plan
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Looking at {goal.name}, your timeline, and any linked balances.
                    This usually takes a few seconds.
                  </p>
                </div>
              ) : plan ? (
                <div className="mt-5 rounded-2xl border border-line bg-cream px-4 py-4 text-sm">
                  <p className="font-semibold text-ink">
                    {draftPlan ? "New AI plan" : "Saved AI plan"}
                  </p>
                  <p className="mt-2 leading-6 text-muted">
                    {String(plan.summary ?? "")}
                  </p>
                  <p className="mt-3 text-ink">
                    Save about {MONEY.format(Number(plan.cadenceAmount ?? 0))} per{" "}
                    {String(plan.cadenceFrequency ?? "week")}.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
                    {((plan.suggestions as string[] | undefined) ?? [])
                      .slice(0, 4)
                      .map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                  </ul>
                  {!plan.usedFinancialData ? (
                    <p className="mt-3 text-xs text-muted">
                      Built from the goal details only. Connect a bank for a more
                      personalized plan.
                    </p>
                  ) : null}
                  {draftPlan ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-4"
                      disabled={savingPlan || planning}
                      aria-busy={savingPlan}
                      onClick={async () => {
                        setSavingPlan(true);
                        try {
                          await apiRequest(`/goals/${goal.id}/plan`, {
                            method: "POST",
                            body: JSON.stringify({
                              action: "save",
                              plan: draftPlan,
                            }),
                          });
                          setDraftPlan(null);
                          await refresh();
                        } finally {
                          setSavingPlan(false);
                        }
                      }}
                    >
                      {savingPlan ? "Saving..." : "Save plan to goal"}
                    </Button>
                  ) : goal.savedPlanAt ? (
                    <p className="mt-3 text-xs text-muted">
                      Saved {new Date(goal.savedPlanAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-muted">
                  No plan saved yet.
                </p>
              )}
              <div className="mt-6 flex justify-end border-t border-line pt-4">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-[#c23b3b] px-3.5 text-sm font-semibold text-white transition hover:bg-[#a32f2f]"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete quest
                </button>
              </div>
            </section>
          </div>

          {confirmDelete
            ? createPortal(
                <div
                  className="dialog-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !deleting) {
                      setConfirmDelete(false);
                    }
                  }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={deleteTitle}
                    className="dialog-panel game-panel w-full max-w-md rounded-t-3xl p-6 shadow-[0_24px_80px_rgba(35,31,27,0.28)] sm:rounded-3xl"
                  >
                    <h2 id={deleteTitle} className="font-display text-3xl text-ink">
                      Delete {goal.name}?
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      This removes the quest, its savings plan, and its target
                      history. You cannot undo it.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#c23b3b] px-5 text-sm font-semibold text-white transition hover:bg-[#a32f2f] disabled:opacity-60"
                        disabled={deleting}
                        onClick={async () => {
                          setDeleting(true);
                          try {
                            await apiRequest(`/goals/${goal.id}`, { method: "DELETE" });
                            router.push("/dashboard");
                          } catch (caught) {
                            setError((caught as ApiErrorPayload).error);
                            setDeleting(false);
                            setConfirmDelete(false);
                          }
                        }}
                      >
                        {deleting ? "Deleting..." : "Delete quest"}
                      </button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={deleting}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Keep quest
                      </Button>
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

          {goal.changes?.length ? (
            <section className="game-panel overflow-hidden rounded-3xl">
              <div className="border-b border-line px-6 py-4">
                <h2 className="font-display text-2xl text-ink">Target history</h2>
                <p className="mt-1 text-sm text-muted">
                  Each time the amount or the date changed.
                </p>
              </div>
              <ul className="divide-y divide-line">
                {goal.changes.map((change) => {
                  const when = formatDisplayDate(change.changedAt.slice(0, 10));
                  const sameTarget =
                    change.oldTargetAmount === change.newTargetAmount &&
                    change.oldTargetDate === change.newTargetDate;
                  return (
                    <li key={change.changedAt} className="px-6 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                        {when}
                      </p>
                      {change.note && sameTarget ? (
                        <p className="mt-2 text-sm leading-6 text-ink">{change.note}</p>
                      ) : (
                        <div className="mt-3 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                          <div className="rounded-2xl bg-cream px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                              Was
                            </p>
                            <p className="mt-1 font-display text-2xl text-ink">
                              {MONEY.format(change.oldTargetAmount)}
                            </p>
                            <p className="mt-1 text-sm text-muted">
                              {formatDisplayDate(change.oldTargetDate)}
                            </p>
                          </div>
                          <p className="text-center text-sm font-semibold text-muted" aria-hidden="true">
                            to
                          </p>
                          <div className="rounded-2xl border border-teal/25 bg-teal/5 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">
                              Became
                            </p>
                            <p className="mt-1 font-display text-2xl text-ink">
                              {MONEY.format(change.newTargetAmount)}
                            </p>
                            <p className="mt-1 text-sm text-muted">
                              {formatDisplayDate(change.newTargetDate)}
                            </p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <PageFooterNav />
    </section>
  );
}
